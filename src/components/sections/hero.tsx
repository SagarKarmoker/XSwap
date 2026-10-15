import { SwapCard } from '@/components/swap/swap-card'
import { Orbs, GridBackdrop } from '@/components/brand/orbs'
import { TextLink } from '@/components/ui/card'

/**
 * Hero: centred headline, the swap widget as the calm white centre of a sea of
 * colour — exactly the composition the reference system prescribes.
 */
export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <Orbs />
      <GridBackdrop />

      <div className="relative mx-auto max-w-[1200px] px-4 pt-16 pb-24 sm:px-6 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-pills border border-vertex/30 bg-vertex-tint px-3 py-1 text-caption font-w535 text-vertex-deep">
            <span className="size-1.5 rounded-full bg-vertex" />
            Live quotes from Uniswap v3 — every fee tier, every block
          </span>

          <h1 className="max-w-[13ch] text-heading-lg font-w535 text-midnight-ink sm:text-display">
            Swap any X for any Y.
          </h1>

          <p className="mt-5 max-w-[52ch] text-body-lg text-slate">
            XSwap routes a trade across every live pool for the pair, quotes it with the chain&apos;s own math, and
            settles it through SwapRouter02. Paste any ERC-20 address — the curated list is a shortcut, not a wall.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <TextLink href="#markets">Browse live markets</TextLink>
            <span className="text-ash">·</span>
            <TextLink href="#how">See how routing works</TextLink>
          </div>
        </div>

        <div id="swap" className="mx-auto mt-12 w-full max-w-[480px] scroll-mt-28">
          <SwapCard />
        </div>

        <dl className="mx-auto mt-12 grid max-w-[880px] grid-cols-2 gap-x-6 gap-y-6 text-center sm:grid-cols-4">
          {[
            { label: 'Fee tiers checked', value: '4' },
            { label: 'Networks', value: '4' },
            { label: 'Off-chain pricing', value: 'None' },
            { label: 'Custody', value: 'None' },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-caption text-slate">{item.label}</dt>
              <dd className="tnum mt-1 text-subheading font-w535 text-midnight-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}