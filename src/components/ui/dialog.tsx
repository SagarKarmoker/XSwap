import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type DialogProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  /** Hide the header entirely (pickers manage their own search UI). */
  bare?: boolean
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  bare = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so keyboard users are not left behind it.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }, 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-true-black/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'animate-pop relative w-full max-w-[460px] border border-frost bg-white p-5',
          'rounded-t-3xl sm:rounded-buttons',
          className,
        )}
      >
        {!bare ? (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title ? <h2 className="text-subheading font-w535 text-midnight-ink">{title}</h2> : null}
              {description ? <p className="mt-1 text-body-sm text-slate">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-frost hover:text-midnight-ink"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : null}

        {children}
      </div>
    </div>,
    document.body,
  )
}