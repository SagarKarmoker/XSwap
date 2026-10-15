import { useMemo } from 'react'
import { useConnection, useDisconnect, useEnsName } from 'wagmi'
import { Popover, useDisclosure, MenuItem, MenuSeparator } from '@/components/ui/popover'
import { TokenIcon } from '@/components/ui/token-icon'
import { listTokens } from '@/config/tokens'
import { addressUrl, explorerName } from '@/lib/explorer'
import { formatTokenAmount, truncateAddress } from '@/lib/format'
import { useCopyToClipboard } from '@/hooks/use-copy'
import { useNativeBalance, useTokenBalances } from '@/hooks/use-token'
import { ChainList } from './chain-menu'
import { SignInDialog } from './sign-in-dialog'
import { cn } from '@/lib/utils'

/** Account menu: identity, balances, network, sign-in, disconnect. */
export function AccountMenu() {
  const { address, chainId, connector, isConnected } = useConnection()
  const { mutate: disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { copied, copy } = useCopyToClipboard()
  const disclosure = useDisclosure()
  const signIn = useDisclosure()

  const tokens = useMemo(() => listTokens(chainId).slice(0, 4), [chainId])
  const balanceTargets = useMemo(
    () => tokens.map((token) => ({ address: token.address, decimals: token.decimals })),
    [tokens],
  )
  const balances = useTokenBalances(balanceTargets, address, chainId)
  const native = useNativeBalance(chainId)

  if (!isConnected || !address) return null

  return (
    <Popover
      open={disclosure.open}
      onClose={disclosure.hide}
      trigger={
        <button
          type="button"
          onClick={disclosure.toggle}
          aria-expanded={disclosure.open}
          className="flex h-11 max-w-[168px] items-center gap-2 rounded-buttons bg-vertex-tint px-3 text-body font-w535 text-vertex-deep transition-colors hover:bg-vertex-tint-strong"
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-vertex text-[10px] font-w535 text-vertex-ink">
            {(connector?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{ensName ?? truncateAddress(address)}</span>
          <ChevronDown />
        </button>
      }
      panelClassName="w-[304px]"
    >
      <div className="px-3 pt-1 pb-3">
        <p className="text-body font-w535 text-midnight-ink">{ensName ?? truncateAddress(address, 6)}</p>
        <p className="mt-0.5 truncate text-caption text-slate">{connector?.name}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void copy(address)}
            className="inline-flex items-center gap-1.5 text-body-sm text-slate transition-colors hover:text-midnight-ink"
          >
            <CopyGlyph />
            <span className={cn(copied && 'text-vertex-deep')}>{copied ? 'Copied' : 'Copy address'}</span>
          </button>

          {addressUrl(address, chainId) ? (
            <a
              href={addressUrl(address, chainId) as string}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-slate transition-colors hover:text-midnight-ink"
            >
              {explorerName(chainId)} ↗
            </a>
          ) : null}
        </div>
      </div>

      <MenuSeparator />

      <div className="px-3 py-1.5">
        <p className="text-caption text-slate">
          Wallet balance{native.formatted ? ` · ${Number(native.formatted).toFixed(4)}` : ''}
        </p>
        <ul className="mt-2 space-y-1.5">
          {tokens.map((token) => (
            <li key={token.address} className="flex items-center gap-2">
              <TokenIcon token={token} address={token.address} size={18} />
              <span className="text-body-sm text-midnight-ink">{token.symbol}</span>
              <span className="tnum ml-auto text-body-sm text-slate">
                {formatTokenAmount(balances[token.address.toLowerCase()], token.decimals, { maxSignificant: 4 })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <MenuSeparator />

      <ChainList />

      <MenuSeparator />

      <MenuItem onClick={signIn.show}>
        <SignInGlyph />
        Sign in with wallet
      </MenuItem>

      <MenuItem onClick={() => disconnect()} danger>
        <DisconnectGlyph />
        Disconnect
      </MenuItem>

      <SignInDialog open={signIn.open} onClose={signIn.hide} />
    </Popover>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6.5L8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
      <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" strokeLinecap="round" />
    </svg>
  )
}

function SignInGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10.5 10.5H4.8A1.8 1.8 0 0 1 3 8.7V4.8A1.8 1.8 0 0 1 4.8 3h3.9" strokeLinecap="round" />
      <path d="M11 6.5L13.5 9 11 11.5M13.5 9H7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DisconnectGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6.5 2.8H4.2A1.7 1.7 0 0 0 2.5 4.5v7A1.7 1.7 0 0 0 4.2 13.2h2.3" strokeLinecap="round" />
      <path d="M10 5.5L12.5 8 10 10.5M12.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}