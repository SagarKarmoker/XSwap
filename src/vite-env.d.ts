/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WalletConnect Cloud project id — enables the WalletConnect connector when set. */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  /** Optional RPC overrides. Public endpoints are used when these are absent. */
  readonly VITE_RPC_ETHEREUM?: string
  readonly VITE_RPC_ARBITRUM?: string
  readonly VITE_RPC_BASE?: string
  readonly VITE_RPC_OPTIMISM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}