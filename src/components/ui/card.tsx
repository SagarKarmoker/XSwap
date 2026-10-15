import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-cards border border-frost bg-white',
        'shadow-[0_0_10px_0_rgba(19,19,19,0.0031)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sublabel,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  sublabel?: string
  tone?: 'default' | 'positive'
}) {
  return (
    <div className="rounded-cards border border-frost bg-white p-6">
      <p className="text-body font-w535 text-midnight-ink">{label}</p>
      <p
        className={cn(
          'tnum mt-3 text-heading font-w535',
          tone === 'positive' ? 'text-forest' : 'text-midnight-ink',
        )}
      >
        {value}
      </p>
      {sublabel ? <p className="mt-2 text-body-sm text-slate">{sublabel}</p> : null}
    </div>
  )
}

export function SectionHeading({
  children,
  className,
  size = 'heading',
}: {
  children: React.ReactNode
  className?: string
  size?: 'heading' | 'heading-lg' | 'heading-sm'
}) {
  const sizeClass =
    size === 'heading-lg' ? 'text-heading-lg' : size === 'heading-sm' ? 'text-heading-sm' : 'text-heading'
  return (
    <h2 className={cn(sizeClass, 'font-w535 text-midnight-ink', className)}>{children}</h2>
  )
}

/** The design system's inline navigation link — text plus an arrow character. */
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="inline-flex items-center gap-1 text-body font-w535 text-midnight-ink underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:decoration-midnight-ink"
    >
      {children}
      <span aria-hidden>→</span>
    </a>
  )
}