import type { Abi, Address } from 'viem'
import { readContract } from 'viem/actions'
import { FEE_TIERS, getDeployment, type FeeTier, type SupportedChainId } from '@/config/chains'
import { erc20Abi, quoterV1Abi, quoterV2Abi, swapRouter02Abi, v3FactoryAbi, v3PoolAbi } from './abi'

/**
 * XSwap routing engine.
 *
 * Discovery is done through the Uniswap V3 factory's `getPool` getter rather
 * than CREATE2 maths: no init-code hashes to hardcode, so *any* ERC-20 pair
 * that has a pool is routable, including long-tail tokens pasted by the user.
 *
 * Pricing is done by the on-chain Quoter, so a quote is the same math a
 * settlement transaction will execute — not an off-chain approximation.
 */

export type ReadParams = {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * A read function bound to one chain's client.
 *
 * wagmi 3 hands out a plain viem `Client` (transport only), so contract reads go
 * through `viem/actions` rather than client methods. Parallel reads are batched
 * by the transport, which keeps a quote to a couple of round trips without
 * needing a multicall action.
 */
export type ContractReader = (params: ReadParams) => Promise<unknown>

export function contractReader(client: unknown): ContractReader {
  const bound = client as Parameters<typeof readContract>[0]
  return (params) => readContract(bound, params as unknown as Parameters<typeof readContract>[1])
}

export type PoolState = {
  pool: Address
  fee: FeeTier
  token0: Address
  sqrtPriceX96: bigint
  tick: number
  liquidity: bigint
  /** tokenOut per 1 tokenIn, in human units, at the pool's mid price. */
  midPrice: number
}

export type Route = {
  kind: 'univ3'
  chainId: SupportedChainId
  pool: Address
  fee: FeeTier
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  amountOut: bigint
  /** tokenOut per 1 tokenIn including fee and depth impact. */
  executionRate: number
  /** Mid-price rate before fee/impact — the honest reference for impact. */
  midPrice: number
  priceImpactBps: number
  lpFeeBps: number
  tick: number
  liquidity: bigint
}

const BPS = 10_000n
const BPS_NUMBER = 10_000
const Q96 = 2n ** 96n
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function deploymentOrThrow(chainId: number) {
  const deployment = getDeployment(chainId)
  if (!deployment) throw new Error(`Chain ${chainId} is not routable on XSwap`)
  return deployment
}

/** Resolve every fee tier that has a live pool for the pair. */
export async function discoverPools(
  read: ContractReader,
  params: { chainId: number; tokenIn: Address; tokenOut: Address },
): Promise<{ fee: FeeTier; pool: Address }[]> {
  const { v3Factory } = deploymentOrThrow(params.chainId)

  const settled = await Promise.allSettled(
    FEE_TIERS.map(async (fee): Promise<{ fee: FeeTier; pool: Address } | null> => {
      try {
        const pool = (await read({
          address: v3Factory,
          abi: v3FactoryAbi,
          functionName: 'getPool',
          args: [params.tokenIn, params.tokenOut, fee],
        })) as Address
        return pool && pool !== ZERO_ADDRESS ? { fee, pool } : null
      } catch {
        return null
      }
    }),
  )

  return settled
    .map((result) => (result.status === 'fulfilled' ? result.value : null))
    .filter((entry): entry is { fee: FeeTier; pool: Address } => entry !== null)
}

/**
 * Mid price from `slot0`, normalised to "tokenOut per 1 tokenIn".
 *
 * `sqrtPriceX96² / 2^192` is token1_raw per token0_raw, so the direction depends
 * on which side of the pool the input token sits, and the human scale needs the
 * decimals folded in.
 */
export function midPriceFromSqrtPrice(params: {
  sqrtPriceX96: bigint
  token0: Address
  tokenIn: Address
  decimalsIn: number
  decimalsOut: number
}): number {
  const { sqrtPriceX96, token0, tokenIn, decimalsIn, decimalsOut } = params
  if (sqrtPriceX96 <= 0n) return 0

  // (sqrtPriceX96² / 2¹⁹²) is token1_raw per token0_raw. Scaling by 1e30 keeps
  // ~22 significant digits of headroom before the Number conversion.
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * 10n ** 30n) / (Q96 * Q96)
  const priceRaw = Number(scaled) / 1e30
  if (!Number.isFinite(priceRaw) || priceRaw <= 0) return 0

  const direction = token0.toLowerCase() === tokenIn.toLowerCase() ? priceRaw : 1 / priceRaw
  const price = direction * 10 ** (decimalsIn - decimalsOut)
  return Number.isFinite(price) && price > 0 ? price : 0
}

export async function readPoolStates(
  read: ContractReader,
  params: {
    chainId: number
    pools: { fee: FeeTier; pool: Address }[]
    tokenIn: Address
    tokenOut: Address
    decimalsIn: number
    decimalsOut: number
  },
): Promise<PoolState[]> {
  const states = await Promise.all(
    params.pools.map(async ({ fee, pool }): Promise<PoolState | null> => {
      try {
        const [slot0, poolLiquidity, token0] = await Promise.all([
          read({ address: pool, abi: v3PoolAbi, functionName: 'slot0' }),
          read({ address: pool, abi: v3PoolAbi, functionName: 'liquidity' }),
          read({ address: pool, abi: v3PoolAbi, functionName: 'token0' }),
        ])

        const [sqrtPriceX96, tick] = slot0 as [bigint, number, ...unknown[]]
        if (typeof sqrtPriceX96 !== 'bigint') return null

        const token0Address = token0 as Address
        return {
          pool,
          fee,
          token0: token0Address,
          sqrtPriceX96,
          tick: Number(tick),
          liquidity: typeof poolLiquidity === 'bigint' ? poolLiquidity : 0n,
          midPrice: midPriceFromSqrtPrice({
            sqrtPriceX96,
            token0: token0Address,
            tokenIn: params.tokenIn,
            decimalsIn: params.decimalsIn,
            decimalsOut: params.decimalsOut,
          }),
        }
      } catch {
        return null
      }
    }),
  )

  return states.filter((state): state is PoolState => state !== null)
}

/** Exact-input quote through one pool, via the deployed Quoter for that chain. */
export async function quoteThroughPool(
  read: ContractReader,
  params: { chainId: number; tokenIn: Address; tokenOut: Address; fee: FeeTier; amountIn: bigint },
): Promise<bigint> {
  const { quoter, quoterKind } = deploymentOrThrow(params.chainId)

  const raw =
    quoterKind === 'v1'
      ? await read({
          address: quoter,
          abi: quoterV1Abi,
          functionName: 'quoteExactInputSingle',
          args: [params.tokenIn, params.tokenOut, params.fee, params.amountIn, 0n],
        })
      : await read({
          address: quoter,
          abi: quoterV2Abi,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              amountIn: params.amountIn,
              fee: params.fee,
              sqrtPriceLimitX96: 0n,
            },
          ],
        })

  return unwrapAmountOut(raw)
}

/**
 * Quoter V1 declares a single output (viem hands back a bare bigint) while
 * Quoter V2 returns a four-word tuple, so normalise both shapes.
 */
function unwrapAmountOut(raw: unknown): bigint {
  if (typeof raw === 'bigint') return raw
  if (Array.isArray(raw)) return raw[0] as bigint
  if (raw && typeof raw === 'object' && 'amountOut' in raw) {
    return (raw as { amountOut: bigint }).amountOut
  }
  throw new Error('Unexpected Quoter response shape')
}

export type BestRouteParams = {
  chainId: number
  tokenIn: Address
  tokenOut: Address
  decimalsIn: number
  decimalsOut: number
  amountIn: bigint
}

export type BestRouteResult = {
  route: Route | null
  /** Fee tiers that had a pool, even when the quote failed for them. */
  attempted: FeeTier[]
}

/** Quote every fee tier, then keep the best execution. */
export async function findBestRoute(read: ContractReader, params: BestRouteParams): Promise<BestRouteResult> {
  const { chainId, tokenIn, tokenOut, amountIn, decimalsIn, decimalsOut } = params

  const pools = await discoverPools(read, { chainId, tokenIn, tokenOut })
  if (pools.length === 0) return { route: null, attempted: [] }

  const states = await readPoolStates(read, { chainId, pools, tokenIn, tokenOut, decimalsIn, decimalsOut })
  if (states.length === 0) return { route: null, attempted: pools.map((pool) => pool.fee) }

  const quotes = await Promise.all(
    states.map(async (state) => {
      try {
        const amountOut = await quoteThroughPool(read, {
          chainId,
          tokenIn,
          tokenOut,
          fee: state.fee,
          amountIn,
        })
        return amountOut > 0n ? { state, amountOut } : null
      } catch {
        return null
      }
    }),
  )

  const best = quotes
    .filter((entry): entry is { state: PoolState; amountOut: bigint } => entry !== null)
    .sort((a, b) => (b.amountOut > a.amountOut ? 1 : b.amountOut < a.amountOut ? -1 : 0))[0]

  if (!best) return { route: null, attempted: pools.map((pool) => pool.fee) }

  const { state, amountOut } = best
  const lpFeeBps = Math.round(state.fee / 100)
  const lpFeeFraction = lpFeeBps / BPS_NUMBER

  const amountInHuman = Number(amountIn) / 10 ** decimalsIn
  const amountOutHuman = Number(amountOut) / 10 ** decimalsOut
  const executionRate = amountInHuman > 0 ? amountOutHuman / amountInHuman : 0

  // Impact is measured against the mid price *after* the LP fee, so the number
  // the user sees is depth impact rather than a re-labelled fee.
  const expectedAfterFee = amountInHuman * state.midPrice * (1 - lpFeeFraction)
  const priceImpactBps =
    expectedAfterFee > 0
      ? Math.max(0, Math.round(((expectedAfterFee - amountOutHuman) / expectedAfterFee) * BPS_NUMBER))
      : 0

  return {
    route: {
      kind: 'univ3',
      chainId: chainId as SupportedChainId,
      pool: state.pool,
      fee: state.fee,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      executionRate,
      midPrice: state.midPrice,
      priceImpactBps,
      lpFeeBps,
      tick: state.tick,
      liquidity: state.liquidity,
    },
    attempted: pools.map((pool) => pool.fee),
  }
}

export function minimumReceived(amountOut: bigint, slippageBps: number): bigint {
  if (slippageBps <= 0) return amountOut
  return (amountOut * BigInt(BPS - BigInt(slippageBps))) / BPS
}

export type SwapRequest = {
  address: Address
  abi: typeof swapRouter02Abi
  functionName: 'exactInputSingle'
  args: readonly [
    {
      tokenIn: Address
      tokenOut: Address
      fee: number
      recipient: Address
      deadline: bigint
      amountIn: bigint
      amountOutMinimum: bigint
      sqrtPriceLimitX96: bigint
    },
  ]
  value: bigint
}

/** Build the settlement calldata for a route, honouring slippage and deadline. */
export function buildSwapRequest(
  route: Route,
  params: { recipient: Address; slippageBps: number; deadlineMinutes: number; deadlineSeconds?: bigint },
): SwapRequest {
  const { swapRouter02 } = deploymentOrThrow(route.chainId)
  const deadline =
    params.deadlineSeconds ?? BigInt(Math.floor(Date.now() / 1000) + params.deadlineMinutes * 60)

  return {
    address: swapRouter02,
    abi: swapRouter02Abi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: route.tokenIn,
        tokenOut: route.tokenOut,
        fee: route.fee as number,
        recipient: params.recipient,
        deadline,
        amountIn: route.amountIn,
        amountOutMinimum: minimumReceived(route.amountOut, params.slippageBps),
        sqrtPriceLimitX96: 0n,
      },
    ],
    value: 0n,
  }
}

export function buildApprovalRequest(params: {
  chainId: number
  token: Address
  amount: bigint
}): { address: Address; abi: typeof erc20Abi; functionName: 'approve'; args: readonly [Address, bigint] } {
  const { swapRouter02 } = deploymentOrThrow(params.chainId)
  return {
    address: params.token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [swapRouter02, params.amount],
  }
}

/** Live pool facts for the markets table — no indexer, only chain state. */
export type MarketRow = {
  tokenA: Address
  tokenB: Address
  pools: {
    fee: FeeTier
    pool: Address
    tick: number
    liquidity: bigint
    /** price of tokenA in tokenB */
    price: number
  }[]
  bestPool: { fee: FeeTier; pool: Address; tick: number; liquidity: bigint; price: number } | null
}

export async function readMarket(
  read: ContractReader,
  params: {
    chainId: number
    tokenA: Address
    tokenB: Address
    decimalsA: number
    decimalsB: number
  },
): Promise<MarketRow> {
  const { chainId, tokenA, tokenB, decimalsA, decimalsB } = params

  const pools = await discoverPools(read, { chainId, tokenIn: tokenA, tokenOut: tokenB })
  const states = await readPoolStates(read, {
    chainId,
    pools,
    tokenIn: tokenA,
    tokenOut: tokenB,
    decimalsIn: decimalsA,
    decimalsOut: decimalsB,
  })

  const rows = states.map((state) => ({
    fee: state.fee,
    pool: state.pool,
    tick: state.tick,
    liquidity: state.liquidity,
    price: state.midPrice,
  }))

  const best = rows.slice().sort((a, b) => b.liquidity > a.liquidity ? 1 : b.liquidity < a.liquidity ? -1 : 0)[0] ?? null

  return { tokenA, tokenB, pools: rows, bestPool: best }
}