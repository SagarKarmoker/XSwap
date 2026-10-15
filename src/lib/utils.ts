/** Tiny classname joiner — enough for this codebase, no dependency needed. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}

/** Tailwind-friendly conditional class helper. */
export function classes(entries: Record<string, boolean | undefined>): string {
  return cn(...Object.entries(entries).map(([name, on]) => (on ? name : undefined)))
}

/** localStorage that never throws (private mode, disabled storage, SSR). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* no-op */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* no-op */
    }
  },
  getJson<T>(key: string, fallback: T): T {
    const raw = storage.get(key)
    if (!raw) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  setJson(key: string, value: unknown): void {
    storage.set(key, JSON.stringify(value))
  },
}

export const STORAGE_KEYS = {
  slippage: 'xswap:slippage-bps',
  deadline: 'xswap:deadline-minutes',
  recentTokens: 'xswap:recent-tokens',
  recentChain: 'xswap:last-chain',
  signature: 'xswap:signature',
} as const