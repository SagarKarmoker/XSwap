import { useState } from 'react'
import { FEE_TIERS, feeTierLabel, shortChainName } from '@/config/chains'
import { minimumReceived, type Route } from '@/lib/router'
import { formatDuration, formatPrice, formatTokenAmount } from '@/lib/format'
import { poolUrl } from '@/lib/explorer'
import { cn } from '@/lib/utils'

/**
 * Quote disclosure.
 *
 * Everything shown here comes from the same on-chain read that produced the
 * amount: the pool's `slot0` gives the mid price, the pool's liquidity and fee
 * tier describe the venue, and `amountOutMinimum` is the number the router will
 * enforce on-chain.
 */
export function QuoteDetails({
  route,
  slippageBps,
  quoteDurationMs,
  blockNumber,
  isFetching,
  chainId,
  decimalsOut,
  symbolIn,
  symbolOut,
}: {
  route: Route | null
  slippageBps: number
  quoteDurationMs: number
  blockNumber: bigint | undefined
  isFetching: boolean
  chainId: number | undefined
  decimalsOut: number
  symbolIn: string
  symbolOut: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (!route) return null

  const minReceived = minimumReceived(route.amountOut, slippageBps)
  const minReceivedText = formatTokenAmount(minReceived, decimalsOut, { maxSignificant: 6 })
  const impactTone =
    route.priceImpactBps <= 50
      ? 'text-forest'
      : route.priceImpactBps <= 200
        ? 'text-slate'
        : 'text-crimson'

  return (
    <div className="animate-slide-in mt-3 rounded-panels border border-frost bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-slate">
          <span className="shrink-0 text-midnight-ink">
            1 {symbolIn} = {formatPrice(route.executionRate)} {symbolOut}
          </span>
          <svg
            viewBox="0 0 16 16"
            className={cn('size-3 shrink-0 text-ash transition-transform', expanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M4 6.5L8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isFetching ? <span className="tnum text-caption text-ash">updating…</span> : null}
        </span>
      </button>

      <dl className="mt-3 space-y-2 text-body-sm">
        <Row label={`Minimum received (slippage ${(slippageBps / 100).toFixed(2)}%)`} value={minReceivedText} />
        <Row
          label="Price impact"
          value={
            <span className={cn('tnum', impactTone)}>
              {route.priceImpactBps < 10 ? '<0.01%' : `${(route.priceImpactBps / 100).toFixed(2)}%`}
            </span>
          }
        />
        <Row label="Mid price" value={`${formatPrice(route.midPrice)} ${symbolOut}`} />
        <Row label="Pool fee tier" value={feeTierLabel(route.fee)} />
        <Row
          label="Route"
          value={
            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-frost px-2 py-0.5 text-caption font-w535 text-midnight-ink">
                Uniswap v3
              </span>
              <span className="rounded-full bg-vertex-tint px-2 py-0.5 text-caption font-w535 text-vertex-deep">
                {feeTierLabel(route.fee)} pool
              </span>
              {poolUrl(route.pool, chainId) ? (
                <a
                  href={poolUrl(route.pool, chainId) as string}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-slate underline decoration-frost underline-offset-2 hover:text-midnight-ink"
                >
                  pool ↗
                </a>
              ) : null}
            </span>
          }
        />
        <Row label="Network" value={shortChainName(chainId)} />
        <Row
          label="Quoted from block"
          value={<span className="tnum">{blockNumber ? `#${blockNumber.toString()}` : '—'}</span>}
        />
        <Row label="Quote round trip" value={<span className="tnum">{formatDuration(quoteDurationMs)}</span>} />
      </dl>

      {expanded ? (
        <p className="mt-3 border-t border-frost pt-3 text-caption text-slate">
          XSwap quotes every live fee tier ({FEE_TIERS.map((fee) => feeTierLabel(fee)).join(', ')}) for this pair and
          executes against whichever returned the most output. The route above is the winner for this size.
        </p>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-slate">{label}</dt>
      <dd className="tnum text-right text-midnight-ink">{value}</dd>
    </div>
  )
}