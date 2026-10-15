/**
 * Deployment check.
 *
 * `src/config/chains.ts` hardcodes factory / quoter / router addresses. This
 * script proves each one still exists and that a real quote flows through it, so
 * a bad address shows up here instead of as an empty quote in the UI.
 *
 *   pnpm check:deployments
 */
import { contractReader, discoverPools, findBestRoute, readPoolStates } from '../src/lib/router'
import { getDeployment, supportedChains } from '../src/config/chains'
import { listTokens } from '../src/config/tokens'
import { rpcUrls } from '../src/config/env'
import { createConfig, http } from 'wagmi'
import { fallback } from 'viem'
import { getBytecode } from 'viem/actions'
import type { Address } from 'viem'

const config = createConfig({
  chains: supportedChains,
  connectors: [],
  transports: Object.fromEntries(
    supportedChains.map((chain) => [chain.id, fallback((rpcUrls[chain.id as 1] ?? []).map((url) => http(url)))]),
  ),
  ssr: false,
})

const clientFor = (chainId: number) =>
  (config as unknown as { getClient: (params: { chainId: number }) => unknown }).getClient({ chainId })

let failures = 0

for (const chain of supportedChains) {
  const chainId = chain.id
  const deployment = getDeployment(chainId)
  const tokens = listTokens(chainId)
  const base = tokens.find((token) => token.symbol === 'WETH') ?? tokens[0]
  const quote = tokens.find((token) => token.symbol === 'USDC') ?? tokens[1]

  const client = clientFor(chainId) as Parameters<typeof getBytecode>[0]

  const checks: [string, boolean][] = []
  for (const [label, address] of [
    ['v3Factory', deployment?.v3Factory],
    ['quoter', deployment?.quoter],
    ['swapRouter02', deployment?.swapRouter02],
  ] as const) {
    if (!address) {
      checks.push([label, false])
      continue
    }
    try {
      const code = await getBytecode(client, { address: address as Address })
      checks.push([label, Boolean(code && code.length > 2)])
    } catch {
      checks.push([label, false])
    }
  }

  let pools: number[] = []
  let quoteLine = 'no route'
  if (base && quote && base.address !== quote.address) {
    try {
      const read = contractReader(clientFor(chainId))
      const discovered = await discoverPools(read, {
        chainId,
        tokenIn: base.address,
        tokenOut: quote.address,
      })
      const states = await readPoolStates(read, {
        chainId,
        pools: discovered,
        tokenIn: base.address,
        tokenOut: quote.address,
        decimalsIn: base.decimals,
        decimalsOut: quote.decimals,
      })
      pools = discovered.map((pool) => pool.fee)

      const best = await findBestRoute(read, {
        chainId,
        tokenIn: base.address,
        tokenOut: quote.address,
        decimalsIn: base.decimals,
        decimalsOut: quote.decimals,
        amountIn: 10n ** 18n,
      })
      if (best.route) {
        quoteLine = `1 ${base.symbol} → ${(Number(best.route.amountOut) / 10 ** quote.decimals).toFixed(4)} ${quote.symbol} via ${best.route.fee / 10_000}% pool (impact ${(best.route.priceImpactBps / 100).toFixed(3)}%)`
      }
      checks.push(['quote', Boolean(best.route)])
      checks.push(['poolState', states.length > 0])
    } catch (error) {
      checks.push(['quote', false])
      console.error(`  ! ${chain.name}:`, (error as Error).message.split('\n')[0])
    }
  }

  const ok = checks.every(([, passed]) => passed)
  if (!ok) failures += 1

  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${chain.name.padEnd(14)} ${checks
      .map(([label, passed]) => `${label}:${passed ? 'ok' : 'MISSING'}`)
      .join(' ')} | tiers [${pools.join(', ')}] | ${quoteLine}`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} chain(s) failed — check src/config/chains.ts`)
  process.exit(1)
}
console.log('\nAll deployments routable.')