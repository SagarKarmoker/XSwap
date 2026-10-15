import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { Kbd } from '@/components/ui/copy-button'
import { ChainBadgeButton } from '@/components/wallet/chain-menu'
import { WalletButton } from '@/components/wallet/wallet-button'
import { useActiveChainId } from '@/hooks/use-active-chain'
import { SearchCommand } from './search-command'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { id: 'swap', label: 'Swap' },
  { id: 'markets', label: 'Markets' },
  { id: 'how', label: 'How it works' },
  { id: 'stats', label: 'Network' },
]

/**
 * Nav: logo + links on the left, centred search, network + wallet on the right —
 * the layout described in the reference system.
 */
export function NavBar() {
  const chainId = useActiveChainId()
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('swap')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] },
    )

    NAV_LINKS.forEach((link) => {
      const element = document.getElementById(link.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 w-full bg-white/90 backdrop-blur-sm transition-shadow duration-200',
          scrolled && 'shadow-[0_1px_0_0_rgba(19,19,19,0.06)]',
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2" aria-label="XSwap home">
            <Logo size={28} />
            <span className="hidden text-subheading font-w535 text-midnight-ink sm:inline">XSwap</span>
          </a>

          <nav className="hidden items-center md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={cn(
                  'relative rounded-panels px-3 py-2 text-body transition-colors duration-150',
                  activeSection === link.id ? 'text-midnight-ink' : 'text-slate hover:text-midnight-ink',
                )}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute inset-x-3 -bottom-px h-px transition-colors',
                    activeSection === link.id ? 'bg-vertex' : 'bg-transparent',
                  )}
                />
              </a>
            ))}
          </nav>

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                'hidden h-10 w-full max-w-[400px] items-center gap-2 rounded-pills bg-frost px-4 text-body',
                'text-slate transition-colors duration-150 hover:bg-frost/70 lg:flex',
              )}
            >
              <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-left">Search tokens</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search tokens"
              className="grid size-10 place-items-center rounded-full bg-frost text-slate transition-colors hover:text-midnight-ink lg:hidden"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
            </button>

            <ChainBadgeButton />
            <span id="connect-cta">
              <WalletButton />
            </span>
          </div>
        </div>
      </header>

      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} chainId={chainId} />
    </>
  )
}

