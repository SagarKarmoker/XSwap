import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Address, Hash } from 'viem'
import { usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import type { Route } from '@/lib/router'
import { buildApprovalRequest, buildSwapRequest } from '@/lib/router'
import { useTokenAllowance } from './use-token'
import { useToast } from '@/state/toast-context'
import { explorerName, txUrl } from '@/lib/explorer'
import { getDeployment } from '@/config/chains'

/**
 * Execution
 *
 * Two real writes, in order:
 *   1. `approve` the router for exactly the quoted input amount
 *   2. `exactInputSingle` with `amountOutMinimum` derived from the slippage setting
 *
 * Each is simulated first (eth_call) so a doomed transaction surfaces a readable
 * reason in the UI instead of an opaque wallet rejection.
 */

export type ExecutionPhase = 'approve' | 'swap'
export type ExecutionStage =
  | 'idle'
  | 'simulating'
  | 'awaiting-signature'
  | 'pending'
  | 'success'
  | 'error'

export type UseSwapExecutionParams = {
  route: Route | null
  chainId: number | undefined
  owner: Address | undefined
  slippageBps: number
  deadlineMinutes: number
  /** Preview wallets can read but not sign. */
  canSign?: boolean
  /** Skip execution entirely (wrong chain, no quote). */
  enabled?: boolean
}

export type ExecutionState = {
  needsApproval: boolean
  allowance: bigint | undefined
  isApproved: boolean
  stage: ExecutionStage
  phase: ExecutionPhase
  error: string | null
  txHash: Hash | undefined
  receiptStatus: 'success' | 'reverted' | undefined
  isBusy: boolean
  isSimulating: boolean
  approve: () => Promise<void>
  swap: () => Promise<void>
  reset: () => void
}

function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/User rejected|User denied|rejected the request|denied transaction/i.test(message)) {
    return 'Request rejected in your wallet'
  }
  if (/insufficient funds/i.test(message)) return 'Not enough gas to cover this transaction'
  if (/TRANSFER_FROM_FAILED/i.test(message)) {
    return 'The router could not pull your tokens — the allowance may already be spent'
  }
  if (/\bSTF\b/i.test(message)) return 'Token transfer failed — check your balance and allowance'
  if (/deadline/i.test(message)) return 'The transaction deadline had already passed'
  const firstLine = message.split('\n')[0] ?? message
  return firstLine.length > 150 ? `${firstLine.slice(0, 150)}…` : firstLine
}

export function useSwapExecution(params: UseSwapExecutionParams): ExecutionState {
  const { route, chainId, owner, slippageBps, deadlineMinutes, canSign = true, enabled = true } = params

  const toast = useToast()
  const client = usePublicClient({ chainId: chainId as 1 })

  const { allowance } = useTokenAllowance(route?.tokenIn, owner, chainId)

  const [phase, setPhase] = useState<ExecutionPhase>('swap')
  const [stage, setStage] = useState<ExecutionStage>('idle')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | undefined>(undefined)

  const writeContract = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: Boolean(txHash) } })

  // A fresh route or slippage change invalidates a previous failure.
  useEffect(() => {
    setError(null)
    if (stage === 'error') setStage('idle')
  }, [route?.pool, route?.amountOut, slippageBps, stage])

  const isApproved = useMemo(() => {
    if (!route) return false
    if (allowance === undefined) return false
    return allowance >= route.amountIn
  }, [allowance, route])

  const needsApproval = Boolean(route) && !isApproved && allowance !== undefined

  const derivedStage: ExecutionStage = receipt.isSuccess
    ? 'success'
    : receipt.isError
      ? 'error'
      : writeContract.isPending
        ? 'awaiting-signature'
        : receipt.isLoading
          ? 'pending'
          : isSimulating
            ? 'simulating'
            : stage

  const isBusy = derivedStage === 'awaiting-signature' || derivedStage === 'pending' || isSimulating

  const reset = useCallback(() => {
    setStage('idle')
    setError(null)
    setTxHash(undefined)
  }, [])

  const approve = useCallback(async () => {
    if (!route || !chainId || !owner) return
    const deployment = getDeployment(chainId)
    if (!deployment || !client) return

    if (!canSign) {
      const message = 'The preview wallet is read-only — connect a real wallet to sign this approval'
      setStage('error')
      setError(message)
      toast.push({ tone: 'error', title: 'Nothing to sign', description: message })
      return
    }

    try {
      setPhase('approve')
      setError(null)
      setIsSimulating(true)

      const request = buildApprovalRequest({ chainId, token: route.tokenIn, amount: route.amountIn })
      await client.simulateContract({
        account: owner,
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
      })

      setIsSimulating(false)
      setStage('awaiting-signature')
      const hash = await writeContract.mutateAsync({
        account: owner,
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
      })
      setTxHash(hash)
      toast.push({
        tone: 'info',
        title: 'Approval submitted',
        description: 'The swap unlocks as soon as this confirms.',
        action: { label: `View on ${explorerName(chainId)}`, href: txUrl(hash, chainId) ?? undefined },
      })
    } catch (caught) {
      setIsSimulating(false)
      setStage('error')
      setError(humanizeError(caught))
      toast.push({ tone: 'error', title: 'Approval failed', description: humanizeError(caught) })
    }
  }, [canSign, chainId, client, owner, route, toast, writeContract])

  const swap = useCallback(async () => {
    if (!route || !chainId || !owner) return
    if (!client) return

    if (!canSign) {
      const message = 'The preview wallet is read-only — connect a real wallet to sign this swap'
      setStage('error')
      setError(message)
      toast.push({ tone: 'error', title: 'Nothing to sign', description: message })
      return
    }

    try {
      setPhase('swap')
      setError(null)
      setIsSimulating(true)

      const request = buildSwapRequest(route, {
        recipient: owner,
        slippageBps,
        deadlineMinutes,
      })

      await client.simulateContract({
        account: owner,
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
        value: request.value,
      })

      setIsSimulating(false)
      setStage('awaiting-signature')
      const hash = await writeContract.mutateAsync({
        account: owner,
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
        value: request.value,
      })
      setTxHash(hash)
      toast.push({
        tone: 'info',
        title: 'Swap submitted',
        description: 'Waiting for block confirmation.',
        action: { label: `View on ${explorerName(chainId)}`, href: txUrl(hash, chainId) ?? undefined },
      })
    } catch (caught) {
      setIsSimulating(false)
      setStage('error')
      setError(humanizeError(caught))
      toast.push({ tone: 'error', title: 'Swap failed', description: humanizeError(caught) })
    }
  }, [canSign, chainId, client, deadlineMinutes, owner, route, slippageBps, toast, writeContract])

  return {
    needsApproval,
    allowance,
    isApproved,
    stage: enabled ? derivedStage : 'idle',
    phase,
    error,
    txHash,
    receiptStatus: receipt.isSuccess ? 'success' : receipt.isError ? 'reverted' : undefined,
    isBusy,
    isSimulating,
    approve,
    swap,
    reset,
  }
}

export { humanizeError }