import { useMemo, useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useConnection } from 'wagmi'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { storage, STORAGE_KEYS } from '@/lib/utils'
import { truncateAddress } from '@/lib/format'

/**
 * Sign-in with wallet (SIWE-style).
 *
 * A nonce is minted locally, embedded in a human-readable message, and the
 * returned signature is kept in local storage. This proves the connection is
 * live without sending a transaction or talking to a backend.
 */
export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, chainId } = useConnection()
  const { mutateAsync: signMessageAsync, isPending } = useSignMessage()
  const [signature, setSignature] = useState<string | null>(() => storage.get(STORAGE_KEYS.signature))
  const [error, setError] = useState<string | null>(null)
  const [nonce] = useState(() => crypto.randomUUID().replace(/-/g, '').slice(0, 16))

  const message = useMemo(() => {
    if (!address) return ''
    return [
      `${address} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Signing is free and sends no transaction. It proves control of this wallet to XSwap.',
      '',
      `URI: ${typeof window === 'undefined' ? 'xswap.app' : window.location.origin}`,
      'Version: 1',
      `Chain ID: ${chainId ?? 'unknown'}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n')
  }, [address, chainId, nonce])

  async function handleSign() {
    if (!address) return
    try {
      setError(null)
      const result = await signMessageAsync({ message, account: address })
      storage.set(STORAGE_KEYS.signature, result)
      setSignature(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.split('\n')[0] : 'Signature failed')
    }
  }

  function handleSignOut() {
    storage.remove(STORAGE_KEYS.signature)
    setSignature(null)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={signature ? 'Signed in' : 'Sign in with your wallet'}
      description={
        signature
          ? 'Your wallet is verified for this browser.'
          : 'One signature, no transaction, no gas.'
      }
    >
      {signature ? (
        <div className="space-y-4">
          <div className="rounded-panels border border-vertex-tint-strong bg-vertex-tint px-3 py-3">
            <p className="text-body-sm text-vertex-ink">
              Signed by {truncateAddress(address ?? '', 6)} at{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            </p>
            <p className="tnum mt-1 truncate text-caption text-vertex-deep">{signature}</p>
          </div>
          <Button variant="outline" fullWidth onClick={handleSignOut}>
            Sign out of XSwap
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-panels bg-frost p-3 font-mono text-caption leading-relaxed text-slate">
            {message}
          </pre>

          {error ? <p className="text-body-sm text-crimson">{error}</p> : null}

          <Button fullWidth loading={isPending} onClick={() => void handleSign()}>
            {isPending ? 'Check your wallet…' : 'Sign message'}
          </Button>
        </div>
      )}
    </Dialog>
  )
}