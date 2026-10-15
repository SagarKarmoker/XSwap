import { forwardRef } from 'react'
import { Chevron } from '@/components/brand/logo'
import { TokenIcon } from '@/components/ui/token-icon'
import type { XToken } from '@/config/tokens'
import { formatTokenAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * One side of the swap.
 *
 * The reference system calls for: 20px radius, 1px #f2f2f2 border, 16px
 * padding, a #6a6a6a 12px label, a #131313 36px amount, and the token chip on
 * the right. The secondary line carries the rate; the balance sits on that same
 * line, right-aligned, so the label row stays free for the settings trigger.
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
    /** Secondary line: rate, resolved output, empty-state message. */
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
        'relative rounded-buttons border bg-white p-4 transition-colors duration-150',
        error ? 'border-crimson/50' : 'border-frost focus-within:border-ash/70',
        disabled && 'opacity-60',
      )}
    >
      <span className="text-label leading-label tracking-label text-slate">{label}</span>

      <div className="mt-1.5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {readOnly ? (
            <p
              className={cn(
                'tnum truncate text-amount leading-amount tracking-amount font-w535',
                isLoading ? 'text-ash' : 'text-midnight-ink',
              )}
            >
              {isLoading ? '' : value || '0'}
            </p>
          ) : (
            <input
              ref={ref}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="0"
              aria-label={label}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange?.(event.target.value)}
              className={cn(
                'tnum w-full truncate border-0 bg-transparent p-0 text-amount leading-amount tracking-amount font-w535 text-midnight-ink',
                'placeholder:text-ash focus:outline-none disabled:cursor-not-allowed',
              )}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onSelectToken}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-buttons border border-frost bg-white pl-2 pr-4',
            'text-body-lg font-w535 text-midnight-ink transition-colors duration-150 hover:bg-frost',
          )}
        >
          <TokenIcon token={token} address={token.address} size={24} />
          <span>{token.symbol}</span>
          <Chevron className="text-slate" />
        </button>
      </div>

      <div className="mt-1.5 flex min-h-5 items-center justify-between gap-3">
        <span
          className={cn(
            'truncate text-label leading-label tracking-label',
            error ? 'text-crimson' : 'text-slate',
          )}
        >
          {error ?? hint}
        </span>

        {balance !== undefined ? (
          <span className="flex shrink-0 items-center gap-1.5 text-label leading-label tracking-label text-slate">
            <span className="tnum">
              {balanceLabel} {formatTokenAmount(balance, token.decimals, { maxSignificant: 4 })}
            </span>
            {onMax ? (
              <button
                type="button"
                onClick={onMax}
                aria-label={`Set the maximum ${token.symbol} balance`}
                className="h-5 rounded-md border border-vertex/40 bg-vertex-tint px-1.5 text-caption font-w535 tracking-caption text-vertex-deep transition-colors hover:bg-vertex-tint-strong"
              >
                MAX
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      {isLoading && side === 'out' ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 h-5">
          <div className="skeleton h-full w-full rounded-panels" />
        </div>
      ) : null}
    </div>
  )
})