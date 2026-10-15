import { SectionHeading, StatCard } from '@/components/ui/card'
import { Orbs } from '@/components/brand/orbs'
import { FEE_TIERS, supportedChains } from '@/config/chains'
import { totalIndexedTokens } from '@/config/tokens'
import { useSwapState } from '@/state/swap-context'
import { formatDuration } from '@/lib/format'

/**
 * How routing works, plus the platform stats block from the reference design
 * system (2-column split: heading + copy on the left, 2×2 metrics on the right).
 */
export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-[1200px] scroll-mt-24 overflow-hidden px-4 sm:px-6">
      <Orbs variant="section" />

      <div className="relative grid gap-12 py-4 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <SectionHeading size="heading-lg">Built for all the ways you swap.</SectionHeading>
          <p className="mt-5 max-w-[46ch] text-body-lg text-slate">
            There is no pricing model hidden behind the interface. XSwap asks the chain what a trade is worth,
            shows you the venue, fee and impact, then asks your wallet to sign it.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              {
                title: 'Pair discovery, not a whitelist',
                body: 'Pools are found through the Uniswap v3 factory getter, so a token missing from the list still routes — paste its address and the app reads symbol and decimals itself.',
              },
              {
                title: 'Four fee tiers, one best route',
                body: `Every pair is quoted across ${FEE_TIERS.length} fee tiers (${FEE_TIERS.map((fee) => `${fee / 10_000}%`).join(', ')}) and the best output wins.`,
              },
              {
                title: 'On-chain slippage, not a UI promise',
                body: 'Your tolerance becomes amountOutMinimum in the router call. If the market moves beyond it, the transaction reverts instead of filling you worse.',
              },
            ].map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-vertex-tint text-caption font-w535 text-vertex-deep">
                  {index + 1}
                </span>
                <div>
                  <p className="text-body-lg font-w535 text-midnight-ink">{item.title}</p>
                  <p className="mt-1 max-w-[52ch] text-body text-slate">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <NetworkStats />
      </div>
    </section>
  )
}

/**
 * Live stats: three are static facts about the deployment, one is measured from
 * this session's own quote round trips.
 */
function NetworkStats() {
  const { lastQuoteMs } = useSwapState()

  return (
    <div className="grid grid-cols-2 gap-4" id="stats">
      <StatCard label="Networks routable" value={supportedChains.length} sublabel="Ethereum, Arbitrum, Base, OP" />
      <StatCard label="Fee tiers per pair" value={FEE_TIERS.length} sublabel="Quoted in parallel, best wins" />
      <StatCard label="Tokens indexed" value={totalIndexedTokens()} sublabel="Any other ERC-20 resolves on paste" />
      <StatCard
        label="Fastest quote"
        tone="positive"
        value={lastQuoteMs > 0 ? formatDuration(lastQuoteMs) : '—'}
        sublabel="Measured in this session, live on-chain read"
      />
    </div>
  )
}