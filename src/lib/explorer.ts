import { dexDeployments, type SupportedChainId } from '@/config/chains'
import { isAddress } from './utils'

function explorerBase(chainId: number | undefined): string | null {
  if (!chainId || !(chainId in dexDeployments)) return null
  return dexDeployments[chainId as SupportedChainId].explorer
}

export function addressUrl(address: string, chainId: number | undefined): string | null {
  const base = explorerBase(chainId)
  if (!base || !isAddress(address)) return null
  return `${base}/address/${address}`
}

export function tokenUrl(address: string, chainId: number | undefined): string | null {
  const base = explorerBase(chainId)
  if (!base || !isAddress(address)) return null
  return `${base}/token/${address}`
}

export function txUrl(hash: string | undefined, chainId: number | undefined): string | null {
  const base = explorerBase(chainId)
  if (!base || !hash) return null
  return `${base}/tx/${hash}`
}

export function poolUrl(pool: string | undefined, chainId: number | undefined): string | null {
  const base = explorerBase(chainId)
  if (!base || !pool || pool === '0x0000000000000000000000000000000000000000') return null
  return `${base}/address/${pool}`
}

export function explorerName(chainId: number | undefined): string {
  if (!chainId || !(chainId in dexDeployments)) return 'Explorer'
  return dexDeployments[chainId as SupportedChainId].explorerName
}