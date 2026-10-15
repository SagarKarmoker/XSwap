import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PopoverProps = {
  open: boolean
  onClose: () => void
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  panelClassName?: string
}

/**
 * Lightweight popover: no portal, closes on outside click and Escape. Anchored
 * to a trigger so the nav can host account, chain and settings menus without a
 * positioning library.
 */
export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
}: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onClose()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger}
      {open ? (
        <div
          className={cn(
            'animate-pop absolute top-[calc(100%+10px)] z-40 rounded-buttons border border-frost bg-white p-2',
            'shadow-[0_10px_40px_-16px_rgba(19,19,19,0.35)]',
            align === 'right' && 'right-0',
            align === 'left' && 'left-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

type MenuItemProps = {
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  danger?: boolean
  className?: string
  title?: string
}

export function MenuItem({ onClick, children, disabled, danger, className, title }: MenuItemProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-panels px-3 py-2.5 text-left text-body',
        'transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50',
        danger ? 'text-crimson hover:bg-crimson/5' : 'text-midnight-ink hover:bg-frost',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px w-full bg-frost" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-1 pb-2 text-caption text-slate">{children}</p>
}

/** Controlled/uncontrolled disclosure used by the nav and card headers. */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial)
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    toggle: () => setOpen((value) => !value),
  }
}