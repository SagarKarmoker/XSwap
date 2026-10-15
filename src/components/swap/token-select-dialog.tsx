import { useMemo, useState } from 'react'
import { useConnection } from 'wagmi'
import { Dialog } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/copy-button'
import { TokenIcon } from '@/components/ui/token-icon'
import { Spinner } from '@/components/ui/spinner'
import { listTokens, type XToken } from '@/config/tokens'
import { useTokenBalances, useTokenMeta, normalizeAddress } from '@/hooks/use-token'
import { useActiveChainId } from '@/hooks/use-active-chain'
import { formatTokenAmount } from '@/lib/format'
import { storage, STORAGE_KEYS, cn } from '@/lib/utils'

/**
 * Token picker.
 *
 * Search matches symbol, name or address. Because it resolves arbitrary ERC-20
 * addresses live, any token X is reachable — the curated list is only the fast
 * path, not the boundary.
 */
export function TokenSelectDialog({
  open,
  onClose,
  onSelect,
  selected,
  side,
}: {
  open: boolean
  onClose: () => void
  onSelect: (token: XToken) => void
  selected?: XToken
  /** Which side of the swap is picking, used for copy and to exclude the other side. */
  side: 'in' | 'out'
}) {
  const { address } = useConnection()
  const chainId = useActiveChainId()
  const [query, setQuery] = useState('')
  const tokens = useMemo(() => listTokens(chainId), [chainId])

  const balanceTargets = useMemo(
    () => tokens.map((token) => ({ address: token.address, decimals: token.decimals })),
    [tokens],
  )
  const balances = useTokenBalances(balanceTargets, address, chainId)

  const trimmed = query.trim()
  // Normalise casing up front: explorers hand out lowercase addresses and viem
  // refuses to checksum-match a malformed one.
  const pastedAddress = useMemo(() => normalizeAddress(trimmed), [trimmed])

  const filtered = useMemo(() => {
    if (!trimmed) return tokens
    const needle = trimmed.toLowerCase()
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(needle) ||
        token.name.toLowerCase().includes(needle) ||
        token.address.toLowerCase().includes(needle),
    )
  }, [tokens, trimmed])

  const sorted = useMemo(() => {
    if (!address) return filtered
    return [...filtered].sort((a, b) => {
      const balanceA = balances[a.address.toLowerCase()] ?? 0n
      const balanceB = balances[b.address.toLowerCase()] ?? 0n
      if (balanceA === 0n && balanceB === 0n) return 0
      if (balanceA === 0n) return 1
      if (balanceB === 0n) return -1
      return balanceB > balanceA ? 1 : -1
    })
  }, [address, balances, filtered])

  function remember(token: XToken) {
    const key = `${chainId ?? 0}:${token.address.toLowerCase()}`
    const recent = storage.getJson<string[]>(STORAGE_KEYS.recentTokens, [])
    storage.setJson(STORAGE_KEYS.recentTokens, [key, ...recent.filter((entry) => entry !== key)].slice(0, 6))
  }

  function handleSelect(token: XToken) {
    remember(token)
    onSelect(token)
    setQuery('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} bare className="max-w-[460px]">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 px-5 pt-5">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <input
              data-autofocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, symbol or paste an address"
              spellCheck={false}
              autoComplete="off"
              className="h-12 w-full rounded-inputs bg-frost pr-3 pl-10 text-body text-midnight-ink outline-none placeholder:text-slate focus:bg-white focus:ring-2 focus:ring-vertex/60"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-frost hover:text-midnight-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[54vh] min-h-[220px] overflow-y-auto px-2 pt-3 pb-2">
          {pastedAddress ? (
            <PastedTokenOption address={pastedAddress} chainId={chainId} onSelect={handleSelect} />
          ) : null}

          {sorted.length === 0 && !pastedAddress ? (
            <p className="px-3 py-8 text-center text-body-sm text-slate">
              No match in the curated list. Paste an ERC-20 address to resolve it on-chain.
            </p>
          ) : null}

          <ul className="space-y-0.5">
            {sorted.map((token) => (
              <TokenRow
                key={token.address}
                token={token}
                balance={balances[token.address.toLowerCase()]}
                isSelected={selected?.address.toLowerCase() === token.address.toLowerCase()}
                onSelect={() => handleSelect(token)}
              />
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-frost px-5 py-3 text-caption text-slate">
          <span>
            {side === 'in' ? 'Choose the token you pay with' : 'Choose the token you receive'}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </div>
    </Dialog>
  )
}

function TokenRow({
  token,
  balance,
  isSelected,
  onSelect,
}: {
  token: XToken
  balance: bigint | undefined
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-panels px-3 py-2.5 text-left transition-colors duration-100',
          isSelected ? 'bg-vertex-tint' : 'hover:bg-frost',
        )}
      >
        <TokenIcon token={token} address={token.address} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-w535 text-midnight-ink">{token.symbol}</span>
          <span className="block truncate text-caption text-slate">{token.name}</span>
        </span>
        {balance !== undefined ? (
          <span className="tnum shrink-0 text-body-sm text-slate">
            {formatTokenAmount(balance, token.decimals, { maxSignificant: 4 })}
          </span>
        ) : null}
        {isSelected ? (
          <svg
            viewBox="0 0 16 16"
            className="size-3.5 shrink-0 text-vertex-deep"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
    </li>
  )
}

/** Resolves a pasted ERC-20 address against the chain, then selects it. */
function PastedTokenOption({
  address,
  chainId,
  onSelect,
}: {
  address: string
  chainId: number
  onSelect: (token: XToken) => void
}) {
  const { meta, isLoading, error } = useTokenMeta(address, chainId)
  const known = useMemo(
    () => listTokens(chainId).find((token) => token.address.toLowerCase() === address.toLowerCase()),
    [address, chainId],
  )

  if (known) return null

  if (!meta) {
    return (
      <div className="mb-2 flex items-center gap-3 rounded-panels border border-frost px-3 py-3">
        {isLoading ? (
          <>
            <Spinner className="size-4 shrink-0 text-slate" />
            <span className="text-body-sm text-slate">Reading {shorten(address)} from the chain…</span>
          </>
        ) : (
          <>
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-crimson/10 text-[10px] font-w535 text-crimson">
              !
            </span>
            <span className="text-body-sm text-crimson">{error ?? 'Could not read this address'}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mb-2">
      <p className="px-3 pb-1.5 text-caption text-vertex-deep">Resolved on-chain — not in the curated list</p>
      <button
        type="button"
        onClick={() =>
          onSelect({
            chainId: chainId as XToken['chainId'],
            address: meta.address,
            symbol: meta.symbol,
            name: meta.name,
            decimals: meta.decimals,
            category: meta.category,
          })
        }
        className="flex w-full items-center gap-3 rounded-panels border border-vertex-tint-strong bg-vertex-tint/60 px-3 py-2.5 text-left transition-colors hover:bg-vertex-tint"
      >
        <TokenIcon
          token={{ symbol: meta.symbol, category: meta.category, chainId: chainId as XToken['chainId'] }}
          address={meta.address}
          size={32}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-w535 text-midnight-ink">{meta.symbol}</span>
          <span className="block truncate font-mono text-caption text-slate">{shorten(meta.address)}</span>
        </span>
      </button>
    </div>
  )
}

function shorten(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}