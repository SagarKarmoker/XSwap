import { useEffect, useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useBlockNumber, usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import type { Route } from '@/lib/router'
import { isSupportedChain } from '@/config/chains'
import { contractReader, findBestRoute, readMarket } from '@/lib/router'
import { tryParseUnits } from '@/lib/format'
import { useSwapState } from '@/state/swap-context'

/** Quote timings are surfaced in the stats card; no separate probe query needed. */
function useReportQuote(): (durationMs: number) => void {
  return useSwapState().reportQuote
}

/**
 * Quote lifecycle
 *
 * Quotes come from the on-chain Quoter, so they are as fresh as the last block.
 * The previous quote is kept on screen while the next one is in flight (that is
 * what `keepPreviousData` is for) so the card never flashes an empty number.
 */

export type QuoteQueryInput = {
  chainId: number | undefined
  tokenIn: Address
  tokenOut: Address
  decimalsIn: number
  decimalsOut: number
  amountIn: string
  enabled?: boolean
}

export type QuoteState = {
  route: Route | null
  attempted: number[]
  durationMs: number
  blockNumber: bigint | undefined
  isFetching: boolean
  isPending: boolean
  error: Error | null
  /** Populated when the pair simply has no pool rather than when the RPC broke. */
  emptyReason: 'no-amount' | 'no-route' | null
}

export function useRouteQuote(input: QuoteQueryInput): QuoteState {
  const { chainId, tokenIn, tokenOut, decimalsIn, decimalsOut, amountIn, enabled = true } = input

  const amountInRaw = useMemo(() => tryParseUnits(amountIn, decimalsIn), [amountIn, decimalsIn])
  const hasAmount = amountInRaw !== null && amountInRaw > 0n
  const routable = isSupportedChain(chainId)

  const client = usePublicClient({ chainId: chainId as 1 })
  const read = useMemo(() => (client ? contractReader(client) : undefined), [client])

  const query = useQuery({
    queryKey: ['xswap', 'quote', chainId, tokenIn, tokenOut, amountInRaw?.toString()],
    enabled: enabled && routable && hasAmount && Boolean(read),
    staleTime: 8_000,
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!read) throw new Error('No RPC client for this chain')
      const startedAt = performance.now()
      const result = await findBestRoute(read, {
        chainId: chainId as number,
        tokenIn,
        tokenOut,
        decimalsIn,
        decimalsOut,
        amountIn: amountInRaw as bigint,
      })
      return {
        result,
        durationMs: performance.now() - startedAt,
      }
    },
  })

  const { data: blockNumberData } = useBlockNumber({
    chainId: chainId as 1,
    query: { enabled: routable, staleTime: 10_000, refetchInterval: 20_000 },
  })

  const route = query.data?.result.route ?? null
  const attempted = query.data?.result.attempted ?? []

  // Feed the stats card with real timings instead of a second synthetic quote.
  const reportQuote = useReportQuote()
  useEffect(() => {
    if (route && query.data) reportQuote(query.data.durationMs)
  }, [query.data, reportQuote, route])

  return {
    route: route && hasAmount ? route : null,
    attempted,
    durationMs: query.data?.durationMs ?? 0,
    blockNumber: blockNumberData,
    isFetching: query.isFetching,
    isPending: query.isPending && hasAmount,
    error: (query.error as Error | null) ?? null,
    emptyReason: !hasAmount ? 'no-amount' : routable && !query.isPending && !route ? 'no-route' : null,
  }
}

export type MarketQueryInput = {
  chainId: number | undefined
  tokenA: Address
  tokenB: Address
  decimalsA: number
  decimalsB: number
}

export function useMarket(input: MarketQueryInput) {
  const { chainId, tokenA, tokenB, decimalsA, decimalsB } = input
  const client = usePublicClient({ chainId: chainId as 1 })
  const read = useMemo(() => (client ? contractReader(client) : undefined), [client])

  return useQuery({
    queryKey: ['xswap', 'market', chainId, tokenA, tokenB],
    enabled: isSupportedChain(chainId) && Boolean(read),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!read) throw new Error('No RPC client for this chain')
      return readMarket(read, { chainId: chainId as number, tokenA, tokenB, decimalsA, decimalsB })
    },
  })
}