import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy'

export function CopyButton({
  value,
  label = 'Copy',
  className,
  children,
}: {
  value: string
  label?: string
  className?: string
  children?: ReactNode
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex items-center gap-1.5 text-body-sm text-slate transition-colors hover:text-midnight-ink',
        className,
      )}
    >
      {children ?? (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
          <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" strokeLinecap="round" />
        </svg>
      )}
      <span className={cn(copied && 'text-vertex-deep')}>{copied ? 'Copied' : label}</span>
    </button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-frost bg-white px-1.5 py-0.5 font-sans text-caption text-slate">
      {children}
    </kbd>
  )
}