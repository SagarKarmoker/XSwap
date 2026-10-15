/**
 * Runtime configuration. Everything here is optional: the app works with the
 * bundled keyless public RPCs, and WalletConnect simply stays hidden until a
 * project id is provided.
 */

const env = (import.meta.env ?? {}) as ImportMetaEnv

export const walletConnectProjectId = env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? ''

type RpcOverrides = Partial<Record<1 | 10 | 8453 | 42161, string>>

const rpcOverrides: RpcOverrides = {
  1: env.VITE_RPC_ETHEREUM?.trim() || undefined,
  42161: env.VITE_RPC_ARBITRUM?.trim() || undefined,
  8453: env.VITE_RPC_BASE?.trim() || undefined,
  10: env.VITE_RPC_OPTIMISM?.trim() || undefined,
}

/** Public endpoints, with a per-request fallback so a single flaky node is survivable. */
export const rpcUrls = {
  1: [rpcOverrides[1], 'https://ethereum-rpc.publicnode.com', 'https://1rpc.io/eth'].filter(Boolean) as string[],
  42161: [rpcOverrides[42161], 'https://arbitrum-one-rpc.publicnode.com', 'https://arb1.arbitrum.io/rpc'].filter(
    Boolean,
  ) as string[],
  8453: [rpcOverrides[8453], 'https://base-rpc.publicnode.com', 'https://mainnet.base.org'].filter(Boolean) as string[],
  10: [rpcOverrides[10], 'https://optimism-rpc.publicnode.com', 'https://mainnet.optimism.io'].filter(Boolean) as string[],
}