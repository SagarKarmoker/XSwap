import { arbitrum, base, mainnet, optimism } from 'viem/chains'
import type { Chain } from 'viem'

/**
 * Chains XSwap routes on. Every address below was verified on-chain against a
 * live JSON-RPC before being committed (factory getter, quoter quote, router
 * bytecode), so the app only ships networks it can genuinely quote and settle.
 */
export type SupportedChainId = 1 | 10 | 8453 | 42161

export const supportedChains = [mainnet, arbitrum, base, optimism] as const satisfies readonly Chain[]

/**
 * `QuoterKind` matters: the Quoter V1 signature is flat, Quoter V2 takes a single
 * struct. Both are read with `eth_call`, so the ABI must be declared `view` even
 * though the on-chain functions are `nonpayable`.
 */
export type QuoterKind = 'v1' | 'v2'

export type DexDeployment = {
  /** Uniswap V3 factory — used for `getPool`, the only reliable pool discovery. */
  v3Factory: `0x${string}`
  /** Quoter used for exact-input quotes. */
  quoter: `0x${string}`
  quoterKind: QuoterKind
  /** SwapRouter02 — settles `exactInputSingle` and holds the ERC-20 allowance. */
  swapRouter02: `0x${string}`
  explorer: string
  explorerName: string
}

export const dexDeployments: Record<SupportedChainId, DexDeployment> = {
  1: {
    v3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    quoterKind: 'v1',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    explorer: 'https://etherscan.io',
    explorerName: 'Etherscan',
  },
  42161: {
    v3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    quoterKind: 'v2',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    explorer: 'https://arbiscan.io',
    explorerName: 'Arbiscan',
  },
  8453: {
    v3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    quoterKind: 'v2',
    swapRouter02: '0x2626664c2603336E57B271c5C0b26F421741e481',
    explorer: 'https://basescan.org',
    explorerName: 'Basescan',
  },
  10: {
    v3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    quoterKind: 'v2',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    explorer: 'https://optimistic.etherscan.io',
    explorerName: 'Optimistic Etherscan',
  },
}

/** Every fee tier Uniswap V3 deploys a pool for, in hundredths of a bip. */
export const FEE_TIERS = [100, 500, 3000, 10000] as const
export type FeeTier = (typeof FEE_TIERS)[number]

/** 500 → "0.05%". A tier is hundredths of a bip, so divide by 10 000 for a percent. */
export const feeTierLabel = (fee: FeeTier): string => `${fee / 10_000}%`

/** Fee in basis points: 500 → 5 bps (0.05%). */
export const feeTierBps = (fee: FeeTier): number => Math.round(fee / 100)

export function getChain(chainId: number | undefined): Chain | undefined {
  if (!chainId) return undefined
  return supportedChains.find((chain) => chain.id === chainId)
}

export function getDeployment(chainId: number | undefined): DexDeployment | undefined {
  if (!chainId || !(chainId in dexDeployments)) return undefined
  return dexDeployments[chainId as SupportedChainId]
}

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId != null && chainId in dexDeployments
}

export function shortChainName(chainId: number | undefined): string {
  switch (chainId) {
    case 1:
      return 'Ethereum'
    case 10:
      return 'OP Mainnet'
    case 8453:
      return 'Base'
    case 42161:
      return 'Arbitrum'
    default:
      return chainId ? `Chain ${chainId}` : 'Unknown network'
  }
}

export function chainSymbol(chainId: number | undefined): string {
  return getChain(chainId)?.nativeCurrency.symbol ?? 'ETH'
}