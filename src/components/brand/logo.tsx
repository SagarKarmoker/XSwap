import { cn } from '@/lib/utils'

/**
 * The XSwap mark: an X drawn as two crossing arrows — one inbound, one outbound —
 * which is literally what the product does. Stroke-only, like every other icon
 * in the system.
 */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-2', className)}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <rect width="32" height="32" rx="9" fill="var(--color-vertex)" />
        <path
          d="M8.5 10.5L14 16l-5.5 5.5M23.5 10.5L18 16l5.5 5.5"
          stroke="var(--color-vertex-ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 7.5v17"
          stroke="var(--color-vertex-ink)"
          strokeOpacity="0.32"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="2 2.6"
        />
      </svg>
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logo size={26} />
      <span className="text-subheading font-w535 tracking-tight text-midnight-ink">XSwap</span>
    </span>
  )
}

/** Small decorative chevrons reused by token chips and menus. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-3.5', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M4 6.5L8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}