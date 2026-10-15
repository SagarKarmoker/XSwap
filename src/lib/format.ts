import { formatUnits } from 'viem'

/**
 * `formatUnits` loses precision in the browser for 18-decimal values, so every
 * token amount in XSwap goes through BigInt string maths first.
 */

export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim()
  if (!trimmed) return 0n

  const negative = trimmed.startsWith('-')
  const body = negative ? trimmed.slice(1) : trimmed
  if (!/^\d*(\.\d*)?$/.test(body) || body === '' || body === '.') {
    throw new Error(`"${value}" is not a valid amount`)
  }

  const [whole = '0', fraction = ''] = body.split('.')

  // Digits past the token's precision are truncated rather than rejected, which
  // keeps typing smooth; the input UI already refuses to go further.
  const keptFraction = fraction.slice(0, decimals).padEnd(decimals, '0')
  const result = BigInt(`${whole || '0'}${keptFraction}`)

  return negative ? -result : result
}

/** Parse without throwing; returns null for anything unusable. */
export function tryParseUnits(value: string, decimals: number): bigint | null {
  try {
    return parseUnits(value, decimals)
  } catch {
    return null
  }
}

/** True when the string is a plausible amount for a token with `decimals`. */
export function isValidAmountInput(value: string, decimals: number): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  if (!/^\d*\.?\d*$/.test(trimmed)) return false
  if (trimmed === '.') return false

  const [, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) return false

  // Everything that is left after removing digits and dots must be empty.
  return trimmed.replace(/[0-9.]/g, '').length === 0
}

/**
 * Format a raw bigint amount for display.
 *
 * All maths is done on the decimal string (never on a float) so an 18-decimal
 * balance cannot lose precision in the browser, then capped at
 * `maxSignificant` digits with grouping — 1,234.56 rather than 1234.56000001.
 */
export type AmountFormatOptions = {
  /** Significant digits kept for small values. Default 6. */
  maxSignificant?: number
  /** Decimals kept next to the integer part below 1e6. Default 2. */
  maxDecimals?: number
  /** Keep every digit (minimum-received, exact quotes). */
  precise?: boolean
  /** Thousands separators. Default true. */
  group?: boolean
}

export function formatTokenAmount(
  value: bigint | undefined,
  decimals: number,
  options: AmountFormatOptions = {},
): string {
  if (value === undefined) return ''
  const { maxSignificant = 6, maxDecimals = 2, precise = false, group = true } = options

  const negative = value < 0n
  const absolute = negative ? -value : value
  if (absolute === 0n) return '0'

  const [integerPart = '0', fractionPart = ''] = formatUnits(absolute, decimals).split('.')
  const fraction = fractionPart.replace(/0+$/, '')

  // `digits` is the number without its decimal point; `pointPos` says how many
  // of those digits sit to the left of the point.
  let digits = `${integerPart}${fraction}`
  let pointPos = integerPart.length

  const leadingZeros = digits.length - digits.replace(/^0+/, '').length
  digits = digits.slice(leadingZeros)
  pointPos -= leadingZeros

  const integerDigits = integerPart.replace(/^0+/, '')

  // Display policy: below 1e6 keep a couple of decimals, above it round to the
  // unit. Without this, a 600M balance would read "598,674,000".
  const budget = precise
    ? digits.length
    : integerDigits.length > 6
      ? integerDigits.length
      : Math.max(maxSignificant, integerDigits.length + maxDecimals)

  if (digits.length > budget) {
    const rounded = roundDigitString(digits, budget)
    // A carry can add a digit (999 → 1000), which moves the point right.
    pointPos += rounded.length - budget
    digits = rounded
  }

  let text: string
  if (pointPos <= 0) {
    text = `0.${'0'.repeat(-pointPos)}${digits}`
  } else if (pointPos >= digits.length) {
    text = `${digits}${'0'.repeat(pointPos - digits.length)}`
  } else {
    // Rounding can leave padding on the right of the point ("1000.00").
    const tail = digits.slice(pointPos).replace(/0+$/, '')
    text = tail ? `${digits.slice(0, pointPos)}.${tail}` : digits.slice(0, pointPos)
  }

  if (group) {
    const [head = '', tail] = text.split('.')
    text = groupThousands(head) + (tail !== undefined ? `.${tail}` : '')
  }

  return `${negative ? '-' : ''}${text}`
}

/** Round a digit string to `keep` significant digits, propagating carry. */
function roundDigitString(digits: string, keep: number): string {
  const head = digits.slice(0, keep)
  const next = digits.charCodeAt(keep) - 48
  if (Number.isNaN(next) || next < 5) return head

  const rounded = (BigInt(head) + 1n).toString()
  return rounded.length > head.length ? rounded : rounded.padStart(head.length, '0')
}

function groupThousands(integerPart: string): string {
  const trimmed = integerPart.replace(/^0+(?=\d)/, '')
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Human price string with a $ prefix when the quote token is a dollar stable. */
export function formatPrice(value: number, options: { currency?: boolean } = {}): string {
  const { currency = false } = options
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return currency ? '$0.00' : '0.00'

  const abs = Math.abs(value)
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6
  const text = value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return currency ? `$${text}` : text
}

export function truncateAddress(address: string, size = 4): string {
  if (!address) return ''
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}