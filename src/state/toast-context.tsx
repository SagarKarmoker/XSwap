import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  title: string
  description?: string
  tone: ToastTone
  action?: { label: string; href?: string; onClick?: () => void }
}

type ToastContextValue = {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS: Record<ToastTone, number> = {
  success: 6000,
  error: 9000,
  info: 5000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      counter.current += 1
      const id = counter.current
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[toast.tone])
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'animate-slide-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-buttons border bg-white p-4 shadow-[0_8px_30px_-12px_rgba(19,19,19,0.25)]',
            toast.tone === 'success' && 'border-vertex-tint-strong',
            toast.tone === 'error' && 'border-crimson/30',
            toast.tone === 'info' && 'border-frost',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-w535',
              toast.tone === 'success' && 'bg-vertex-tint text-vertex-deep',
              toast.tone === 'error' && 'bg-crimson/10 text-crimson',
              toast.tone === 'info' && 'bg-frost text-slate',
            )}
          >
            {toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-body font-w535 text-midnight-ink">{toast.title}</p>
            {toast.description ? (
              <p className="mt-0.5 text-body-sm text-slate break-words">{toast.description}</p>
            ) : null}
            {toast.action ? (
              toast.action.href ? (
                <a
                  href={toast.action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-body-sm font-w535 text-vertex-deep underline decoration-vertex/60 underline-offset-4"
                >
                  {toast.action.label} →
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick?.()
                    onDismiss(toast.id)
                  }}
                  className="mt-2 text-body-sm font-w535 text-vertex-deep underline decoration-vertex/60 underline-offset-4"
                >
                  {toast.action.label} →
                </button>
              )
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
            className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-frost hover:text-midnight-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}