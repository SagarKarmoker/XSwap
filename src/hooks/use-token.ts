import { useMemo } from 'react'
import type { Address } from 'viem'
import { formatUnits, getAddress } from 'viem'
import { useBalance, useConnection, useReadContracts } from 'wagmi'
import { erc20Abi } from '@/lib/abi'
import { getDeployment, type SupportedChainId } from '@/config/chains'
import { findTokenByAddress, type XToken } from '@/config/tokens'
import { isAddress } from '@/lib/utils'

/**
 * Token metadata + balances.
 *
 * Curated tokens carry their own decimals; anything else is resolved live from
 * the contract. That is what makes "any token X" literal: paste an address and
 * the app reads symbol/decimals itself.
 */

export type TokenMeta = {
  address: Address
  symbol: string
  name: string
  decimals: number
  category: XToken['category']
  /** True when the values came from the contract rather than the curated list. */
  resolved: boolean
}

export type TokenMetaResult = {
  meta: TokenMeta | undefined
  isLoading: boolean
  error: string | null
}

/** Accept any casing (explorers hand out lowercase) and checksum it. */
export function normalizeAddress(value: string): Address | null {
  if (!isAddress(value)) return null
  try {
    return getAddress(value)
  } catch {
    return null
  }
}

export function useTokenMeta(address: string | undefined, chainId: number | undefined): TokenMetaResult {
  const normalized = useMemo(() => (address ? normalizeAddress(address) : null), [address])

  const known = useMemo(() => {
    if (!normalized || !chainId) return undefined
    return findTokenByAddress(chainId, normalized)
  }, [normalized, chainId])

  const { data, isPending, isError } = useReadContracts({
    allowFailure: true,
    query: {
      enabled: Boolean(normalized && chainId) && !known,
      staleTime: 1000 * 60 * 60,
      retry: false,
    },
    contracts: normalized
      ? [
          { address: normalized, abi: erc20Abi, functionName: 'symbol' },
          { address: normalized, abi: erc20Abi, functionName: 'decimals' },
          { address: normalized, abi: erc20Abi, functionName: 'name' },
        ]
      : [],
  })

  const meta = useMemo<TokenMeta | undefined>(() => {
    if (known) {
      return {
        address: known.address,
        symbol: known.symbol,
        name: known.name,
        decimals: known.decimals,
        category: known.category,
        resolved: false,
      }
    }
    if (!normalized || !chainId || !data) return undefined

    const symbolResult = data[0]
    const decimalsResult = data[1]
    const nameResult = data[2]
    if (symbolResult?.status !== 'success' || decimalsResult?.status !== 'success') return undefined

    const symbol = String(symbolResult.result).slice(0, 12) || 'TOKEN'
    const decimals = Number(decimalsResult.result)
    const name = nameResult?.status === 'success' ? String(nameResult.result) : symbol

    return {
      address: normalized,
      symbol,
      name,
      decimals: Number.isFinite(decimals) ? decimals : 18,
      category: 'defi',
      resolved: true,
    }
  }, [known, normalized, chainId, data])

  const error = useMemo(() => {
    if (!normalized || !chainId) return 'That is not a contract address'
    if (known || meta) return null
    if (isPending) return null
    if (isError) return 'The chain did not answer — try again'
    if (data && !meta) return 'No ERC-20 token found at that address'
    return null
  }, [normalized, chainId, known, meta, isPending, isError, data])

  return { meta, isLoading: Boolean(normalized) && !known && !meta && !error, error }
}

/** Balance for one or more tokens, read in a single multicall. */
export function useTokenBalances(
  tokens: Array<{ address: Address; decimals: number }>,
  owner: Address | undefined,
  chainId: number | undefined,
): Record<string, bigint> {
  // Normalise first: a single non-checksummed address makes viem reject the whole
  // aggregate call, which would silently zero out *every* balance in the list.
  const targets = useMemo(
    () =>
      tokens
        .map((token) => normalizeAddress(token.address))
        .filter((address): address is Address => address !== null),
    [tokens],
  )

  const { data } = useReadContracts({
    allowFailure: true,
    query: {
      enabled: Boolean(owner && chainId && targets.length > 0),
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
    contracts:
      owner && chainId
        ? targets.map((address) => ({
            address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [owner],
          }))
        : [],
  })

  return useMemo(() => {
    const balances: Record<string, bigint> = {}
    if (!data) return balances
    targets.forEach((address, index) => {
      const result = data[index]
      if (result?.status === 'success') {
        balances[address.toLowerCase()] = result.result as bigint
      }
    })
    return balances
  }, [data, targets])
}

/** Allowance the router holds over the user's input token. */
export function useTokenAllowance(
  token: Address | undefined,
  owner: Address | undefined,
  chainId: number | undefined,
): { allowance: bigint | undefined; isLoading: boolean } {
  const spender = getDeployment(chainId)?.swapRouter02
  const normalizedToken = token ? normalizeAddress(token) : null

  const { data, isPending } = useReadContracts({
    allowFailure: true,
    query: {
      enabled: Boolean(normalizedToken && owner && spender),
      staleTime: 10_000,
    },
    contracts:
      normalizedToken && owner && spender
        ? [
            {
              address: normalizedToken,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [owner, spender],
            },
          ]
        : [],
  })

  const allowance = useMemo(() => {
    const result = data?.[0]
    if (!result || result.status !== 'success') return undefined
    return result.result as bigint
  }, [data])

  return { allowance, isLoading: isPending }
}

/** Native balance, used for the network-cost line and the account menu. */
export function useNativeBalance(chainId: number | undefined): {
  value: bigint | undefined
  formatted: string | undefined
  isPending: boolean
} {
  const { address } = useConnection()
  const { data, isPending } = useBalance({
    address,
    chainId: chainId as SupportedChainId,
    query: { enabled: Boolean(address && chainId), staleTime: 15_000 },
  })

  return {
    value: data?.value,
    formatted: data ? formatUnits(data.value, data.decimals) : undefined,
    isPending,
  }
}