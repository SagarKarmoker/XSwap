import { useMemo, useState } from 'react'
import { useConnect, useConnectors } from 'wagmi'
import type { Connector } from 'wagmi'
import { Dialog } from '@/components/ui/dialog'
import { MenuLabel } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { connectorIconFor } from '@/lib/wagmi'
import { cn } from '@/lib/utils'

/**
 * Connect flow.
 *
 * `useConnectors` lists every EIP-6963 wallet the browser actually has, each as
 * its own connector, so the user picks "Rabby" or "Coinbase" by name instead of
 * guessing which one won the `window.ethereum` slot.
 */
export function ConnectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useConnectors()
  const { mutate: connect, isPending, error } = useConnect()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { injected, wallets, preview } = useMemo(() => {
    const isInjected = (connector: Connector) =>
      connector.type === 'injected' || connector.id === 'injected'
    return {
      injected: connectors.filter(isInjected),
      wallets: connectors.filter((connector) => !isInjected(connector) && connector.id !== 'mock'),
      preview: connectors.filter((connector) => connector.id === 'mock'),
    }
  }, [connectors])

  function handleConnect(connector: Connector) {
    setPendingId(connector.uid)
    connect(
      { connector },
      {
        onSuccess: () => onClose(),
        onError: () => setPendingId(null),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connect wallet"
      description="Balances are read and swaps are signed by your own wallet. XSwap never takes custody."
    >
      <div className="space-y-4">
        {injected.length > 0 ? (
          <div className="space-y-1.5">
            <MenuLabel>Detected in this browser</MenuLabel>
            {injected.map((connector) => (
              <ConnectorRow
                key={connector.uid}
                connector={connector}
                busy={pendingId === connector.uid && isPending}
                onConnect={() => handleConnect(connector)}
              />
            ))}
          </div>
        ) : null}

        {wallets.length > 0 ? (
          <div className="space-y-1.5">
            <MenuLabel>{injected.length > 0 ? 'Other options' : 'Wallets'}</MenuLabel>
            {wallets.map((connector) => (
              <ConnectorRow
                key={connector.uid}
                connector={connector}
                busy={pendingId === connector.uid && isPending}
                onConnect={() => handleConnect(connector)}
              />
            ))}
          </div>
        ) : null}

        {preview.map((connector) => (
          <ConnectorRow
            key={connector.uid}
            connector={connector}
            busy={pendingId === connector.uid && isPending}
            onConnect={() => handleConnect(connector)}
          />
        ))}

        {injected.length === 0 && wallets.length === 0 ? (
          <p className="rounded-panels bg-frost px-3 py-3 text-body-sm text-slate">
            No browser wallet detected. Install MetaMask, Rabby, Coinbase Wallet or Brave — or use the preview
            wallet below to browse live quotes.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-panels bg-crimson/5 px-3 py-2 text-body-sm text-crimson">{error.message}</p>
        ) : null}

        <p className="pt-1 text-caption text-slate">
          XSwap is a front end. Every action is an on-chain transaction you sign yourself.
        </p>
      </div>
    </Dialog>
  )
}

function ConnectorRow({
  connector,
  onConnect,
  busy,
}: {
  connector: Connector
  onConnect: () => void
  busy: boolean
}) {
  const isPreview = connector.id === 'mock'

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={busy}
      className={cn(
        'flex w-full items-center gap-3 rounded-panels border border-frost px-3 py-3 text-left',
        'transition-colors duration-100 hover:border-ash hover:bg-vertex-tint/50 disabled:opacity-60',
      )}
    >
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-frost text-[15px]">
        {connectorIconFor(connector.id)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-w535 text-midnight-ink">{connector.name}</span>
        <span className="block truncate text-caption text-slate">
          {isPreview ? 'Preview wallet — live quotes and balances, no signing' : connector.type}
        </span>
      </span>
      {busy ? <Spinner className="size-4 text-slate" /> : <ChevronRight />}
    </button>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ash" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}