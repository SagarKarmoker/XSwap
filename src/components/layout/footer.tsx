import { ArrowUpRight, Wordmark } from '@/components/brand/logo'
import { Orbs } from '@/components/brand/orbs'
import { supportedChains, shortChainName } from '@/config/chains'
import { COPYRIGHT, LIVE_URL } from '@/config/site'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Swap X → Y', href: '#swap' },
      { label: 'Markets', href: '#markets' },
      { label: 'How it works', href: '#how' },
    ],
  },
  {
    title: 'Protocol',
    links: [
      { label: 'Uniswap v3 pools', href: 'https://docs.uniswap.org' },
      { label: 'SwapRouter02', href: 'https://docs.uniswap.org/contracts/v3/reference/deployments' },
      { label: 'Quoter', href: 'https://docs.uniswap.org/contracts/v3/reference/deployments' },
    ],
  },
  {
    title: 'Wallets',
    links: [
      { label: 'MetaMask', href: 'https://metamask.io' },
      { label: 'Rabby', href: 'https://rabby.io' },
      { label: 'Coinbase Wallet', href: 'https://wallet.coinbase.com' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative mt-[80px] overflow-hidden border-t border-frost bg-white">
      <Orbs variant="section" />

      <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-body text-slate">
              One interface for swapping any token X for any token Y — priced by the chain, settled by you.
            </p>
            <p className="mt-6 flex flex-wrap gap-2">
              {supportedChains.map((chain) => (
                <span
                  key={chain.id}
                  className="rounded-pills border border-frost px-3 py-1 text-caption text-slate"
                >
                  {shortChainName(chain.id)}
                </span>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-caption text-slate">{column.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={link.href.startsWith('http') ? '_blank' : undefined}
                        rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="text-body text-midnight-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-midnight-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-frost pt-6 text-caption text-slate sm:flex-row sm:items-center sm:justify-between">
          <p className="text-midnight-ink">{COPYRIGHT}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline decoration-transparent underline-offset-4 transition-colors hover:decoration-midnight-ink"
            >
              xswap.netlify.app
              <ArrowUpRight className="size-3" />
            </a>
            <span className="text-ash">·</span>
            <span>Quotes are read from the chain; nothing is stored server-side.</span>
            <span className="text-ash">·</span>
            <span>Not affiliated with Uniswap Labs.</span>
          </p>
        </div>
      </div>
    </footer>
  )
}