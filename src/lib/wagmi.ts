import { createConfig } from 'wagmi'
import { fallback, http } from 'viem'
import { coinbaseWallet, injected, mock, walletConnect } from 'wagmi/connectors'
import { mainnet, arbitrum, base, optimism } from 'wagmi/chains'
import { rpcUrls, walletConnectProjectId } from '@/config/env'
import { supportedChains } from '@/config/chains'

/**
 * Wallet connectivity
 *
 * - `injected()` with EIP-6963 discovery picks up *every* wallet extension the
 *   browser has installed, each as its own connector (MetaMask, Coinbase,
 *   Rabby, Brave, …), instead of only `window.ethereum`.
 * - `coinbaseWallet()` covers the Coinbase Wallet SDK flow on mobile.
 * - `walletConnect()` is registered only when a project id exists, so the app
 *   stays clean in development.
 * - `mock()` gives a zero-install preview wallet for reviewing the interface.
 *
 * `shimDisconnect` is on so MetaMask-style wallets, which cannot disconnect
 * programmatically, still behave correctly in the UI.
 */

const PREVIEW_ACCOUNT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as const

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: 'XSwap', preference: { options: 'smartWalletOnly' } }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: 'XSwap',
            description: 'Swap any token X for any token Y',
            url: window.location.origin,
            icons: [`${window.location.origin}/xswap.svg`],
          },
        }),
      ]
    : []),
  mock({ accounts: [PREVIEW_ACCOUNT] }),
] as const

function transportFor(chainId: 1 | 10 | 8453 | 42161) {
  const urls = rpcUrls[chainId]
  return fallback(urls.map((url) => http(url, { batch: true, retryCount: 1 })))
}

export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum, base, optimism],
  connectors,
  transports: {
    [mainnet.id]: transportFor(1),
    [arbitrum.id]: transportFor(42161),
    [base.id]: transportFor(8453),
    [optimism.id]: transportFor(10),
  },
  multiInjectedProviderDiscovery: true,
  ssr: false,
})

export const supportedChainIds = supportedChains.map((chain) => chain.id)

/** Wallets we ship a purpose-built icon for; anything else falls back to a monogram. */
export const connectorIcon: Record<string, string> = {
  metaMask: '🦊',
  coinbaseWalletSDK: '🟦',
  walletConnect: '🔗',
  'io.metamask': '🦊',
  'com.coinbase.wallet': '🟦',
  'io.rabby': '🐰',
  'com.brave.wallet': '🦁',
  'com.trustwallet.app': '🛡️',
  okxwallet: '🔷',
  injected: '💉',
  mock: '👁️',
}

export function connectorIconFor(id: string | undefined): string {
  if (!id) return '👛'
  return connectorIcon[id] ?? connectorIcon[id.toLowerCase()] ?? '👛'
}