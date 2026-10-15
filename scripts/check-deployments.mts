/**
 * Deployment check.
 *
 * Two classes of hardcoded data can rot, and both fail quietly in the UI:
 *   1. DEX addresses — a wrong factory/quoter/router means no route at all.
 *   2. Token addresses — a wrong *checksum* kills the entire balances multicall,
 *      and a wrong address silently balances the wrong contract.
 *
 * So this verifies the deployments with a real quote, then re-checks every
 * curated token for EIP-55 validity plus its live symbol and decimals.
 *
 *   pnpm check:deployments
 */
import { contractReader, discoverPools, findBestRoute, readPoolStates } from '../src/lib/router'
import { getDeployment, supportedChains } from '../src/config/chains'
import { listTokens } from '../src/config/tokens'
import { rpcUrls } from '../src/config/env'
import { createConfig, http } from 'wagmi'
import { fallback, getAddress, parseAbi } from 'viem'
import { getBytecode, readContract } from 'viem/actions'
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

// --- curated tokens: checksum + live metadata -------------------------------
const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

for (const chain of supportedChains) {
  const chainId = chain.id
  const client = clientFor(chainId) as Parameters<typeof readContract>[0]
  const tokens = listTokens(chainId)
  const problems: string[] = []

  for (const token of tokens) {
    let canonical: Address
    try {
      canonical = getAddress(token.address)
      if (canonical !== token.address) {
        problems.push(`${token.symbol}: non-canonical checksum, use ${canonical}`)
        continue
      }
    } catch {
      problems.push(`${token.symbol}: invalid checksum (${token.address})`)
      continue
    }

    try {
      const [symbol, decimals] = await Promise.all([
        readContract(client, { address: canonical, abi: erc20Abi, functionName: 'symbol' }),
        readContract(client, { address: canonical, abi: erc20Abi, functionName: 'decimals' }),
      ])

      const liveSymbol = String(symbol)
      const expected = [token.symbol, ...(token.symbolAliases ?? [])]
      if (!expected.includes(liveSymbol)) {
        problems.push(`${token.symbol}: on-chain symbol is "${liveSymbol}"`)
      }
      if (Number(decimals) !== token.decimals) {
        problems.push(`${token.symbol}: on-chain decimals is ${String(decimals)}, config says ${token.decimals}`)
      }
    } catch (error) {
      problems.push(`${token.symbol}: read failed — ${(error as Error).message.split('\n')[0].slice(0, 70)}`)
    }
  }

  if (problems.length > 0) failures += 1
  console.log(
    `${problems.length === 0 ? 'PASS' : 'FAIL'}  ${`tokens ${chain.name}`.padEnd(22)} ${tokens.length} checked${
      problems.length ? `\n      ${problems.join('\n      ')}` : ''
    }`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed — see src/config/chains.ts and src/config/tokens.ts`)
  process.exit(1)
}
console.log('\nAll deployments routable, all curated tokens verified.')