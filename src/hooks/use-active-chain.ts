import { useConnection } from 'wagmi'
import { isSupportedChain, type SupportedChainId } from '@/config/chains'

/** The network XSwap reads by default before any wallet connects. */
export const DEFAULT_CHAIN_ID: SupportedChainId = 1

/**
 * Which network the UI should be reading.
 *
 * - No wallet → Ethereum, so quotes and metadata work before connecting.
 * - Wallet on a supported network → that network.
 */
export function useActiveChainId(): SupportedChainId {
  const { chainId } = useConnection()
  return isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID
}

/**
 * The network a trade can actually settle on: `undefined` when the wallet sits
 * on a network XSwap cannot route, which the UI surfaces as a warning.
 */
export function useRoutableChainId(): SupportedChainId | undefined {
  const { chainId } = useConnection()
  if (chainId === undefined) return DEFAULT_CHAIN_ID
  return isSupportedChain(chainId) ? chainId : undefined
}