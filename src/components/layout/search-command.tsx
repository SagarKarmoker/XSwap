import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/copy-button'
import { TokenPair } from '@/components/ui/token-icon'
import { listTokens, type XToken } from '@/config/tokens'
import { shortChainName } from '@/config/chains'
import { useSwapState } from '@/state/swap-context'
import { useDebounced } from '@/hooks/use-debounced'
import { isAddress } from '@/lib/utils'
import { cn } from '@/lib/utils'

/**
 * Global search (⌘K).
 *
 * Searches the curated token universe and jumps the swap card straight to a
 * pair — the "any X for any Y" entry point for people who know what they want.
 */
export function SearchCommand({
  open,
  onClose,
  chainId,
}: {
  open: boolean
  onClose: () => void
  chainId: number | undefined
}) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const debounced = useDebounced(query, 120)
  const { setTokenIn, setTokenOut, setAmountIn, setChainTokens } = useSwapState()

  const tokens = useMemo(() => listTokens(chainId), [chainId])

  const results = useMemo(() => {
    const needle = debounced.trim().toLowerCase()
    const pool = needle
      ? tokens.filter(
          (token) =>
            token.symbol.toLowerCase().includes(needle) ||
            token.name.toLowerCase().includes(needle) ||
            token.address.toLowerCase().includes(needle),
        )
      : tokens.filter((token) => token.featured)

    const unique: XToken[] = []
    const seen = new Set<string>()
    for (const token of pool) {
      if (seen.has(token.address)) continue
      seen.add(token.address)
      unique.push(token)
    }
    return unique.slice(0, 12)
  }, [debounced, tokens])

  const pairs = useMemo(() => {
    const featured = results.filter((token) => token.symbol === 'WETH' || token.symbol === 'USDC')
    const out: [XToken, XToken][] = []
    for (const a of results) {
      for (const b of featured) {
        if (a.address === b.address) continue
        out.push([a, b])
      }
      if (out.length >= 4) break
    }
    return out.slice(0, 4)
  }, [results])

  useEffect(() => setCursor(0), [debounced])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setCursor(0)
    }
  }, [open])

  function apply(tokenIn: XToken, tokenOut: XToken) {
    if (chainId && tokenIn.chainId !== chainId) setChainTokens(tokenIn.chainId)
    setTokenIn(tokenIn)
    setTokenOut(tokenOut)
    setAmountIn('')
    onClose()
    document.getElementById('swap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => Math.min(value + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => Math.max(value - 1, 0))
    }
    if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault()
      const token = results[cursor]
      const counterpart = tokens.find((entry) => entry.address !== token.address)
      if (counterpart) apply(token, counterpart)
    }
  }

  const pasted = isAddress(query.trim())

  return (
    <Dialog open={open} onClose={onClose} bare className="max-w-[560px]">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4">
          <svg
            viewBox="0 0 16 16"
            className="size-4 shrink-0 text-slate"
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
            onKeyDown={onKeyDown}
            placeholder={`Search tokens on ${shortChainName(chainId)}…`}
            spellCheck={false}
            className="h-8 flex-1 bg-transparent text-body-lg outline-none placeholder:text-ash"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-[56vh] overflow-y-auto border-t border-frost px-2 py-2">
          {pasted ? (
            <p className="px-3 py-2 text-caption text-slate">
              That is a contract address — open the token panel in the swap card to resolve it on-chain.
            </p>
          ) : null}

          {pairs.length > 0 ? (
            <div className="mb-2">
              <p className="px-3 pt-1 pb-2 text-caption text-slate">Jump to a pair</p>
              <div className="space-y-0.5">
                {pairs.map(([tokenA, tokenB]) => (
                  <button
                    key={`${tokenA.address}-${tokenB.address}`}
                    type="button"
                    onClick={() => apply(tokenA, tokenB)}
                    className="flex w-full items-center gap-3 rounded-panels px-3 py-2.5 text-left transition-colors hover:bg-frost"
                  >
                    <TokenPair tokenA={tokenA} tokenB={tokenB} addressA={tokenA.address} addressB={tokenB.address} size={26} />
                    <span className="text-body font-w535 text-midnight-ink">
                      {tokenA.symbol} <span className="text-slate">→</span> {tokenB.symbol}
                    </span>
                    <span className="ml-auto truncate text-caption text-slate">{tokenA.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.length > 0 ? (
            <div>
              <p className="px-3 pt-2 pb-2 text-caption text-slate">Tokens</p>
              <div className="space-y-0.5">
                {results.map((token, index) => (
                  <button
                    key={token.address}
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      const counterpart = tokens.find((entry) => entry.address !== token.address)
                      if (counterpart) apply(token, counterpart)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-panels px-3 py-2.5 text-left transition-colors',
                      index === cursor ? 'bg-vertex-tint' : 'hover:bg-frost',
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-frost text-caption font-w535 text-midnight-ink">
                      {token.symbol.slice(0, 2)}
                    </span>
                    <span className="text-body font-w535 text-midnight-ink">{token.symbol}</span>
                    <span className="truncate text-body-sm text-slate">{token.name}</span>
                    <span className="tnum ml-auto shrink-0 font-mono text-caption text-ash">
                      {token.address.slice(0, 6)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.length === 0 && pairs.length === 0 ? (
            <p className="px-3 py-8 text-center text-body-sm text-slate">
              Nothing matches “{query}”. Paste an address in the token panel instead — XSwap resolves any ERC-20.
            </p>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}