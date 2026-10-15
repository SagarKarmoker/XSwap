/**
 * Decorative colour orbs — the one atmospheric element the reference system
 * allows. Recoloured for the greenish tech identity: the confetti now runs
 * jade → lime → sky → violet → amber, heavily blurred, clipped by the viewport.
 */

type OrbSpec = {
  color: string
  size: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  opacity?: number
  drift?: boolean
  blur?: number
}

const HERO_ORBS: OrbSpec[] = [
  { color: 'var(--color-vertex)', size: 230, top: '-50px', left: '-70px', opacity: 0.72, drift: true, blur: 56 },
  { color: 'var(--color-lime)', size: 160, top: '14%', right: '-64px', opacity: 0.5, drift: true, blur: 52 },
  { color: 'var(--color-mint)', size: 190, bottom: '2%', left: '4%', opacity: 0.5, drift: true, blur: 58 },
  { color: 'var(--color-sky)', size: 140, bottom: '-56px', right: '16%', opacity: 0.46, blur: 50 },
  { color: 'var(--color-iris)', size: 120, top: '48%', left: '36%', opacity: 0.34, blur: 48 },
  { color: 'var(--color-ember)', size: 100, top: '4%', left: '60%', opacity: 0.3, blur: 44 },
  { color: 'var(--color-lemon)', size: 84, bottom: '16%', right: '38%', opacity: 0.32, blur: 42 },
  { color: 'var(--color-magenta)', size: 72, top: '62%', right: '6%', opacity: 0.26, blur: 40 },
]

const SECTION_ORBS: OrbSpec[] = [
  { color: 'var(--color-vertex)', size: 160, top: '-34px', right: '-40px', opacity: 0.4, blur: 52 },
  { color: 'var(--color-sky)', size: 120, bottom: '-44px', left: '-30px', opacity: 0.3, blur: 48 },
  { color: 'var(--color-lime)', size: 90, top: '30%', left: '4%', opacity: 0.22, blur: 44 },
]

export function Orbs({ variant = 'hero', className }: { variant?: 'hero' | 'section'; className?: string }) {
  const orbs = variant === 'hero' ? HERO_ORBS : SECTION_ORBS

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {/* Fade the edges so orbs dissolve into the white canvas instead of being
          clipped by the section box. */}
      <div
        className={
          variant === 'hero'
            ? 'absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_72%,transparent)]'
            : 'absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_88%)]'
        }
      >
        {orbs.map((orb, index) => (
          <span
            key={index}
            className={`orb ${orb.drift ? 'animate-float' : ''}`}
            style={{
              backgroundColor: orb.color,
              width: orb.size,
              height: orb.size,
              top: orb.top,
              left: orb.left,
              right: orb.right,
              bottom: orb.bottom,
              opacity: orb.opacity,
              filter: `blur(${orb.blur ?? 64}px)`,
              animationDelay: `${index * 1.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** Faint dot grid + a soft jade bloom behind the hero widget. */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_78%,transparent)] ${className ?? ''}`}
    >
      <div className="dot-grid absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="absolute left-1/2 top-[38%] size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vertex-halo opacity-30 blur-[120px]" />
    </div>
  )
}