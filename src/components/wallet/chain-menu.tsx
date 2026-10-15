import { useConnection, useSwitchChain } from 'wagmi'
import { Popover, useDisclosure, MenuLabel } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { dexDeployments, shortChainName, supportedChains } from '@/config/chains'
import { DEFAULT_CHAIN_ID } from '@/hooks/use-active-chain'
import { cn } from '@/lib/utils'

const CHAIN_COLOR: Record<number, string> = {
  1: '#8251fb',
  10: '#e01a2b',
  8453: '#2abdff',
  42161: '#2d9cdb',
}

export function ChainGlyph({ chainId, size = 18 }: { chainId: number | undefined; size?: number }) {
  const color = chainId ? (CHAIN_COLOR[chainId] ?? '#acacac') : '#acacac'
  const label = chainId ? shortChainName(chainId).slice(0, 1) : '?'

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.5) }}
    >
      {label}
    </span>
  )
}

function TickGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 text-vertex-deep"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6.5L8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Reusable network list for menus (account popover, unsupported-chain prompts). */
export function ChainList() {
  const { chainId } = useConnection()
  const { mutate: switchChain, isPending } = useSwitchChain()

  return (
    <div className="py-1">
      <MenuLabel>Network</MenuLabel>
      {supportedChains.map((chain) => {
        const active = chain.id === chainId
        return (
          <button
            key={chain.id}
            type="button"
            onClick={() => switchChain({ chainId: chain.id })}
            disabled={active || isPending}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-panels px-3 py-2 text-left text-body',
              'transition-colors hover:bg-frost',
              active ? 'bg-vertex-tint text-vertex-deep' : 'text-midnight-ink',
              isPending && !active && 'opacity-60',
            )}
          >
            <ChainGlyph chainId={chain.id} />
            <span className="flex-1 truncate font-w535">{shortChainName(chain.id)}</span>
            {active ? <TickGlyph /> : null}
          </button>
        )
      })}
    </div>
  )
}

/** Nav network picker. Flags unsupported chains instead of silently failing. */
export function ChainBadgeButton() {
  const { chainId, isConnected } = useConnection()
  const { mutate: switchChain, isPending, error } = useSwitchChain()
  const disclosure = useDisclosure()

  // Before a wallet connects the app reads Ethereum, so the badge says so.
  const shownChainId = isConnected ? chainId : DEFAULT_CHAIN_ID
  const supported = chainId === undefined || chainId in dexDeployments
  const unsupported = isConnected && !supported

  return (
    <Popover
      open={disclosure.open}
      onClose={disclosure.hide}
      align="right"
      trigger={
        <button
          type="button"
          onClick={disclosure.toggle}
          aria-label={`Network: ${shortChainName(shownChainId)}`}
          className={cn(
            'flex h-11 items-center gap-1.5 rounded-buttons border px-3 text-body font-w535 transition-colors',
            unsupported
              ? 'border-crimson/40 bg-crimson/5 text-crimson'
              : 'border-carbon bg-transparent text-midnight-ink hover:bg-frost',
          )}
        >
          <ChainGlyph chainId={shownChainId} />
          <span className="hidden sm:inline">{shortChainName(shownChainId)}</span>
          <ChevronDown />
        </button>
      }
      panelClassName="w-[240px]"
    >
      <div className="py-1">
        <MenuLabel>{unsupported ? 'Switch to a supported network' : 'Network'}</MenuLabel>
        {supportedChains.map((chain) => {
          const active = chain.id === chainId
          return (
            <button
              key={chain.id}
              type="button"
              onClick={() => switchChain({ chainId: chain.id })}
              disabled={isPending}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-panels px-3 py-2.5 text-left text-body',
                'transition-colors hover:bg-frost disabled:opacity-60',
                active ? 'bg-vertex-tint text-vertex-deep' : 'text-midnight-ink',
              )}
            >
              <ChainGlyph chainId={chain.id} />
              <span className="flex-1 truncate font-w535">{shortChainName(chain.id)}</span>
              {active ? <TickGlyph /> : null}
            </button>
          )
        })}

        {error ? <p className="px-3 pt-2 text-caption text-crimson">{error.message.split('\n')[0]}</p> : null}
      </div>
    </Popover>
  )
}

/** Persistent strip shown while the wallet sits on a network XSwap cannot route. */
export function NetworkBanner() {
  const { isConnected, chainId } = useConnection()
  const { mutate: switchChain, isPending } = useSwitchChain()

  const unsupported = isConnected && chainId !== undefined && !(chainId in dexDeployments)
  if (!unsupported || !chainId) return null

  return (
    <div className="border-b border-vertex-tint-strong bg-vertex-tint px-4 py-2.5">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-body-sm">
        <span className="text-vertex-ink">
          XSwap routes on Ethereum, Arbitrum, Base and OP — your wallet is on {shortChainName(chainId)}.
        </span>
        <Button size="sm" loading={isPending} onClick={() => switchChain({ chainId: 1 })}>
          Switch to Ethereum
        </Button>
      </div>
    </div>
  )
}