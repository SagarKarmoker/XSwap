import { useMemo } from 'react'
import { useConnection } from 'wagmi'
import { TokenPair } from '@/components/ui/token-icon'
import { Skeleton } from '@/components/ui/spinner'
import { SectionHeading } from '@/components/ui/card'
import { useMarket } from '@/hooks/use-route-quote'
import { listTokens, type XToken } from '@/config/tokens'
import { FEE_TIERS, feeTierLabel, shortChainName } from '@/config/chains'
import { useActiveChainId } from '@/hooks/use-active-chain'
import { formatPrice } from '@/lib/format'
import { poolUrl } from '@/lib/explorer'
import { useSwapState } from '@/state/swap-context'
import { cn } from '@/lib/utils'

/** Markets shown for the active network, paired against the chain's stablecoin. */
function featuredPairs(chainId: number | undefined): [XToken, XToken][] {
  const tokens = listTokens(chainId)
  const base = tokens.find((token) => token.symbol === 'WETH') ?? tokens[0]
  const quote = tokens.find((token) => token.symbol === 'USDC') ?? tokens[1]
  if (!base || !quote) return []

  const others = tokens.filter(
    (token) => token.address !== base.address && token.address !== quote.address,
  )

  return [
    [base, quote],
    ...others.slice(0, 4).map((token) => [token, quote] as [XToken, XToken]),
  ]
}

/**
 * Markets table.
 *
 * No indexer here: every row is read live from the pool contracts — which fee
 * tiers exist, how much liquidity each holds, and the mid price from `slot0`.
 */
export function Markets() {
  const { chainId } = useConnection()
  const activeChain = useActiveChainId()
  const { setTokenIn, setTokenOut, setAmountIn, setChainTokens } = useSwapState()

  const pairs = useMemo(() => featuredPairs(activeChain), [activeChain])

  return (
    <section id="markets" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-frost pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionHeading size="heading-sm">Live markets on {shortChainName(activeChain)}</SectionHeading>
          <p className="mt-2 max-w-[58ch] text-body text-slate">
            Pool state read straight from the chain — no cached numbers. Pick a row to load it into the swap card.
          </p>
        </div>
        <span className="rounded-pills border border-frost px-3 py-1 text-caption text-slate">
          {FEE_TIERS.length} fee tiers monitored
        </span>
      </div>

      <div className="divide-y divide-frost">
        {pairs.map(([tokenA, tokenB]) => (
          <MarketRow
            key={`${tokenA.address}-${tokenB.address}`}
            tokenA={tokenA}
            tokenB={tokenB}
            chainId={activeChain}
            onSelect={() => {
              if (chainId !== activeChain) setChainTokens(activeChain)
              setTokenIn(tokenA)
              setTokenOut(tokenB)
              setAmountIn('')
              document.getElementById('swap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        ))}
      </div>
    </section>
  )
}

function MarketRow({
  tokenA,
  tokenB,
  chainId,
  onSelect,
}: {
  tokenA: XToken
  tokenB: XToken
  chainId: number
  onSelect: () => void
}) {
  const { data, isPending, isError } = useMarket({
    chainId,
    tokenA: tokenA.address,
    tokenB: tokenB.address,
    decimalsA: tokenA.decimals,
    decimalsB: tokenB.decimals,
  })

  const pools = data?.pools ?? []
  const best = data?.bestPool ?? null

  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <TokenPair tokenA={tokenA} tokenB={tokenB} addressA={tokenA.address} addressB={tokenB.address} size={36} />
        <div className="min-w-0">
          <p className="truncate text-body-lg font-w535 text-midnight-ink">
            {tokenA.symbol} <span className="text-slate">/</span> {tokenB.symbol}
          </p>
          <p className="truncate text-caption text-slate">
            {tokenA.name} · {pools.length > 0 ? `${pools.length} live pool${pools.length > 1 ? 's' : ''}` : 'no pools found'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
        <div className="min-w-[140px]">
          {isPending ? (
            <Skeleton className="h-4 w-24" />
          ) : best ? (
            <>
              <p className="tnum text-body font-w535 text-midnight-ink">
                {formatPrice(best.price)} <span className="text-slate">{tokenB.symbol}</span>
              </p>
              <p className="tnum text-caption text-slate">per {tokenA.symbol} · mid price</p>
            </>
          ) : (
            <p className="text-body-sm text-slate">
              {isError ? 'Unreachable right now' : 'No routable pool on this pair'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {pools.length > 0 ? (
            pools.map((pool) => (
              <span
                key={pool.fee}
                title={`Liquidity ${pool.liquidity.toString()}`}
                className={cn(
                  'rounded-pills px-2 py-1 text-caption font-w535',
                  pool.fee === best?.fee
                    ? 'bg-vertex-tint text-vertex-deep'
                    : 'border border-frost text-slate',
                )}
              >
                {feeTierLabel(pool.fee)}
              </span>
            ))
          ) : (
            <span className="text-caption text-ash">—</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {best && poolUrl(best.pool, chainId) ? (
            <a
              href={poolUrl(best.pool, chainId) as string}
              target="_blank"
              rel="noreferrer"
              className="text-caption text-slate underline decoration-frost underline-offset-2 transition-colors hover:text-midnight-ink"
            >
              pool ↗
            </a>
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            disabled={!best}
            className="rounded-buttons bg-vertex-tint px-3 py-2 text-body-sm font-w535 text-vertex-deep transition-colors hover:bg-vertex-tint-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            Swap
          </button>
        </div>
      </div>
    </div>
  )
}