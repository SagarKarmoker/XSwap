import { forwardRef } from 'react'
import { Chevron } from '@/components/brand/logo'
import { TokenIcon } from '@/components/ui/token-icon'
import type { XToken } from '@/config/tokens'
import { formatTokenAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * One side of the swap. The pay panel takes typed input; the receive panel shows
 * the quoted result, with its own "Max"-style affordance omitted by design —
 * slippage belongs to the input side.
 */
export const AmountPanel = forwardRef<
  HTMLInputElement,
  {
    side: 'in' | 'out'
    label: string
    token: XToken
    value: string
    onChange?: (value: string) => void
    onSelectToken: () => void
    balance?: bigint
    balanceLabel?: string
    onMax?: () => void
    /** Secondary line: fiat value, quoted rate, empty-state message. */
    hint?: React.ReactNode
    isLoading?: boolean
    disabled?: boolean
    readOnly?: boolean
    error?: string | null
  }
>(function AmountPanel(
  {
    side,
    label,
    token,
    value,
    onChange,
    onSelectToken,
    balance,
    balanceLabel = 'Balance',
    onMax,
    hint,
    isLoading = false,
    disabled = false,
    readOnly = false,
    error,
  },
  ref,
) {
  return (
    <div
      className={cn(
        'relative rounded-panels border bg-white p-4 transition-colors duration-150',
        error ? 'border-crimson/50' : 'border-frost',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-slate">{label}</span>

        {side === 'in' && balance !== undefined ? (
          <span className="flex items-center gap-1.5 text-caption text-slate">
            <span className="tnum">
              {balanceLabel}: {formatTokenAmount(balance, token.decimals, { maxSignificant: 4 })}
            </span>
            {onMax ? (
              <button
                type="button"
                onClick={onMax}
                className="rounded-md border border-vertex/50 bg-vertex-tint px-1.5 py-0.5 text-caption font-w535 text-vertex-deep transition-colors hover:bg-vertex-tint-strong"
              >
                MAX
              </button>
            ) : null}
          </span>
        ) : null}

        {side === 'out' && balance !== undefined ? (
          <span className="tnum text-caption text-slate">
            {balanceLabel}: {formatTokenAmount(balance, token.decimals, { maxSignificant: 4 })}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {readOnly ? (
            <p
              className={cn(
                'tnum truncate text-[34px] leading-tight font-w535 text-midnight-ink',
                isLoading && 'text-ash',
              )}
            >
              {isLoading ? '' : value || '0'}
            </p>
          ) : (
            <input
              ref={ref}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="0"
              value={value}
              disabled={disabled}
              onChange={(event) => onChange?.(event.target.value)}
              className={cn(
                'tnum w-full truncate border-0 bg-transparent p-0 text-[34px] leading-tight font-w535 text-midnight-ink',
                'placeholder:text-ash focus:outline-none focus:ring-0 disabled:cursor-not-allowed',
              )}
            />
          )}
          <div className="mt-1 min-h-[18px] text-caption text-slate">{hint}</div>
        </div>

        <button
          type="button"
          onClick={onSelectToken}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-buttons px-3 py-2 text-body-lg font-w535 transition-colors duration-150',
            side === 'in'
              ? 'border border-frost bg-white text-midnight-ink hover:bg-frost'
              : 'border border-frost bg-white text-midnight-ink hover:bg-frost',
          )}
        >
          <TokenIcon token={token} address={token.address} size={24} />
          <span>{token.symbol}</span>
          <Chevron className="text-slate" />
        </button>
      </div>

      {isLoading && side === 'out' ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 h-8">
          <div className="skeleton h-full w-full rounded-panels" />
        </div>
      ) : null}
    </div>
  )
})