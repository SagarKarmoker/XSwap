import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { cn } from '@/lib/utils'
import { tokenMark, type XToken } from '@/config/tokens'
import { tokenLogo } from '@/lib/token-logo'

/**
 * Token marks.
 *
 * Curated tokens show their real, canonical logo (see `src/config/token-logos.ts`
 * for provenance). The drawn monogram stays underneath as a permanent fallback
 * layer, so an unknown token, a slow network or a 404 degrades to a coloured
 * glyph instead of a broken image — which is also what keeps "paste any ERC-20"
 * honest.
 */
export function TokenIcon({
  token,
  address,
  size = 32,
  className,
}: {
  token: Pick<XToken, 'symbol' | 'category'> & Partial<Pick<XToken, 'chainId'>>
  /** Enables the real logo; omit for tokens resolved only by symbol. */
  address?: Address | string
  size?: number
  className?: string
}) {
  const { color, glyph } = tokenMark(token)
  const fontSize = Math.round(size * (glyph.length > 1 ? 0.34 : 0.42))
  const src = address && token.chainId ? tokenLogo(token as Pick<XToken, 'chainId'>, address) : undefined

  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <span
      aria-hidden
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full', className)}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <span className="font-w535 text-white" style={{ fontSize, letterSpacing: '-0.04em' }}>
        {glyph}
      </span>

      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full bg-white object-cover"
        />
      ) : null}
    </span>
  )
}

export function TokenPair({
  tokenA,
  tokenB,
  addressA,
  addressB,
  size = 28,
}: {
  tokenA: Pick<XToken, 'symbol' | 'category' | 'chainId'>
  tokenB: Pick<XToken, 'symbol' | 'category' | 'chainId'>
  addressA?: Address | string
  addressB?: Address | string
  size?: number
}) {
  return (
    <span className="flex shrink-0 items-center">
      <TokenIcon token={tokenA} address={addressA} size={size} className="ring-2 ring-white" />
      <TokenIcon token={tokenB} address={addressB} size={size} className="-ml-2 ring-2 ring-white" />
    </span>
  )
}