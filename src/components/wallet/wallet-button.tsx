import { useConnection } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDisclosure } from '@/components/ui/popover'
import { ConnectDialog } from './connect-dialog'
import { AccountMenu } from './account-menu'

/** Nav CTA: Connect when disconnected, the account menu once a wallet is live. */
export function WalletButton() {
  const { isConnected, isConnecting } = useConnection()
  const disclosure = useDisclosure()

  if (isConnected) return <AccountMenu />

  return (
    <>
      <Button size="md" onClick={disclosure.show} loading={isConnecting}>
        {isConnecting ? <Spinner className="size-4" /> : null}
        {isConnecting ? 'Connecting…' : 'Connect'}
      </Button>
      <ConnectDialog open={disclosure.open} onClose={disclosure.hide} />
    </>
  )
}