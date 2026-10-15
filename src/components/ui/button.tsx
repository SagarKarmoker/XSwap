import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

type Variant = 'filled' | 'soft' | 'outline' | 'ghost' | 'pill'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

/**
 * The system allows exactly one filled button per screen. `filled` is that one:
 * saturated jade with white text, 20px radius, no shadow. `soft` is the
 * low-emphasis full-width action that sits next to it.
 */
const variants: Record<Variant, string> = {
  filled: 'bg-vertex-deep text-white hover:bg-vertex-ink active:bg-vertex-ink disabled:bg-ash',
  soft: 'bg-vertex-tint text-vertex-deep hover:bg-vertex-tint-strong active:bg-vertex-tint-strong',
  outline: 'border border-carbon bg-transparent text-midnight-ink hover:bg-frost',
  ghost: 'bg-transparent text-slate hover:text-midnight-ink hover:bg-frost',
  pill: 'border border-carbon bg-transparent text-midnight-ink hover:bg-frost',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-11 px-4 text-body',
  lg: 'h-[60px] px-4 text-body-lg',
}

export function Button({
  variant = 'filled',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-buttons font-w535',
        'transition-[background-color,color,opacity,transform] duration-150 active:scale-[0.985]',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variant === 'pill' && 'rounded-pills',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'grid size-9 place-items-center rounded-full text-slate',
        'transition-colors duration-150 hover:bg-frost hover:text-midnight-ink',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}