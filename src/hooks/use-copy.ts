import { useEffect, useState } from 'react'

export function useCopyToClipboard(resetAfterMs = 1800): {
  copied: boolean
  copy: (value: string) => Promise<boolean>
} {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), resetAfterMs)
    return () => window.clearTimeout(timeout)
  }, [copied, resetAfterMs])

  async function copy(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      return true
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      try {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(ok)
        return ok
      } catch {
        return false
      }
    }
  }

  return { copied, copy }
}