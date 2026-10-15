import { useEffect, useMemo, useRef, useState } from 'react'
import { useConnection } from 'wagmi'
import { Button } from '@/components/ui/button'
import { useDisclosure } from '@/components/ui/popover'
import { AmountPanel } from './amount-panel'
import { TokenSelectDialog } from './token-select-dialog'
import { SwapSettingsDialog } from './swap-settings'
import { QuoteDetails } from './quote-details'
import { useSwapState } from '@/state/swap-context'
import { useRouteQuote } from '@/hooks/use-route-quote'
import { useTokenBalances } from '@/hooks/use-token'
import { useSwapExecution } from '@/hooks/use-swap-execution'
import { useRoutableChainId } from '@/hooks/use-active-chain'
import { formatPrice, formatTokenAmount, isValidAmountInput, tryParseUnits } from '@/lib/format'
import { shortChainName } from '@/config/chains'
import { explorerName, txUrl } from '@/lib/explorer'
import { useToast } from '@/state/toast-context'
import { ConnectDialog } from '@/components/wallet/connect-dialog'
import { cn } from '@/lib/utils'
import type { XToken } from '@/config/tokens'

/**
 * The hero widget.
 *
 * Flat white card, hairline borders, two stacked panels joined by a circular
 * flip button — the exact composition described in the reference design system.
 */
export function SwapCard() {
  const { state, debouncedAmountIn, setTokenIn, setTokenOut, setAmountIn, swapTokens, setSlippageBps, setDeadlineMinutes } =
    useSwapState()
  const { address, chainId, isConnected, connector } = useConnection()
  const toast = useToast()

  const inputRef = useRef<HTMLInputElement>(null)
  const tokenPicker = useDisclosure()
  const pickerSide = useRef<'in' | 'out'>('in')
  const settings = useDisclosure()
  const connect = useDisclosure()

  const [lastSwap, setLastSwap] = useState<{ amountIn: string; amountOut: string } | null>(null)

  // Disconnected, quotes still run against the default network so the widget is
  // useful before anyone connects. Connected to an unsupported chain, no quote.
  const routableChain = useRoutableChainId()

  const quote = useRouteQuote({
    chainId: routableChain,
    tokenIn: state.tokenIn.address,
    tokenOut: state.tokenOut.address,
    decimalsIn: state.tokenIn.decimals,
    decimalsOut: state.tokenOut.decimals,
    amountIn: debouncedAmountIn,
  })

  const amountInRaw = useMemo(
    () => tryParseUnits(state.amountIn, state.tokenIn.decimals),
    [state.amountIn, state.tokenIn.decimals],
  )

  const balanceTargets = useMemo(
    () => [
      { address: state.tokenIn.address, decimals: state.tokenIn.decimals },
      { address: state.tokenOut.address, decimals: state.tokenOut.decimals },
    ],
    [state.tokenIn, state.tokenOut],
  )
  const balances = useTokenBalances(balanceTargets, address, routableChain)

  const balanceIn = balances[state.tokenIn.address.toLowerCase()]
  const balanceOut = balances[state.tokenOut.address.toLowerCase()]

  const execution = useSwapExecution({
    route: quote.route,
    chainId: routableChain,
    owner: address,
    slippageBps: state.slippageBps,
    deadlineMinutes: state.deadlineMinutes,
    canSign: connector?.id !== 'mock',
    enabled: Boolean(quote.route),
  })

  // A confirmed swap should clear the form and celebrate.
  const celebratedRef = useRef(false)
  useEffect(() => {
    if (execution.stage !== 'success' || celebratedRef.current) return
    celebratedRef.current = true

    toast.push({
      tone: 'success',
      title: 'Swap confirmed',
      description: `${state.tokenIn.symbol} → ${state.tokenOut.symbol} settled on ${shortChainName(chainId)}.`,
      action: execution.txHash
        ? { label: `View on ${explorerName(chainId)}`, href: txUrl(execution.txHash, chainId) ?? undefined }
        : undefined,
    })

    setLastSwap({
      amountIn: state.amountIn,
      amountOut: quote.route ? formatTokenAmount(quote.route.amountOut, state.tokenOut.decimals) : '',
    })
    setAmountIn('')
    execution.reset()
    celebratedRef.current = false
  }, [chainId, execution, quote.route, setAmountIn, state.amountIn, state.tokenIn.symbol, state.tokenOut.decimals, state.tokenOut.symbol, toast])

  const amountOutText = quote.route
    ? formatTokenAmount(quote.route.amountOut, state.tokenOut.decimals)
    : ''

  const invalidAmount = !isValidAmountInput(state.amountIn, state.tokenIn.decimals)
  const exceedsBalance =
    amountInRaw !== null && balanceIn !== undefined && amountInRaw > balanceIn && amountInRaw > 0n

  function openPicker(side: 'in' | 'out') {
    pickerSide.current = side
    tokenPicker.show()
  }

  function handleSelect(token: XToken) {
    if (pickerSide.current === 'in') setTokenIn(token)
    else setTokenOut(token)
  }

  function handleMax() {
    if (balanceIn === undefined) return
    // Leave a hair of dust so the approval can never fail on a rounding edge.
    const reserved = 1n / 1000n
    const usable = balanceIn > reserved ? balanceIn - reserved : 0n
    setAmountIn(formatTokenAmount(usable, state.tokenIn.decimals, { maxSignificant: 12 }))
    inputRef.current?.focus()
  }

  const priceHint = quote.route ? (
    <>
      {formatTokenAmount(quote.route.amountOut, state.tokenOut.decimals)}{' '}
      {state.tokenOut.symbol}
      {quote.isFetching ? <span className="ml-1 text-ash">· updating</span> : null}
    </>
  ) : (
    'No route yet — enter an amount'
  )

  const inputHint =
    state.amountIn.length === 0
      ? 'Amount to swap'
      : quote.isPending
        ? 'Quoting…'
        : quote.route
          ? `${formatPrice(quote.route.midPrice, { currency: isDollarish(state.tokenOut) })} per ${state.tokenIn.symbol} (mid)`
          : 'Enter an amount to get a live quote'

  return (
    <div className="w-full">
      <div className="relative rounded-cards border border-frost bg-white p-4 shadow-[0_0_10px_0_rgba(19,19,19,0.0031)]">
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={settings.toggle}
            aria-label="Swap settings"
            className="grid size-8 place-items-center rounded-full text-ash transition-colors hover:bg-frost hover:text-midnight-ink"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="10" cy="10" r="2.6" />
              <path
                d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <AmountPanel
            side="in"
            label="You pay"
            token={state.tokenIn}
            value={state.amountIn}
            onChange={(value) => {
              if (isValidAmountInput(value, state.tokenIn.decimals)) setAmountIn(value)
            }}
            onSelectToken={() => openPicker('in')}
            balance={balanceIn}
            onMax={balanceIn && balanceIn > 0n ? handleMax : undefined}
            hint={inputHint}
            error={invalidAmount ? 'Check the amount format' : exceedsBalance ? 'Not enough balance' : null}
            ref={inputRef}
          />

          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={swapTokens}
              aria-label="Flip the token pair"
              className={cn(
                'group -mt-3 grid size-9 place-items-center rounded-full border border-frost bg-white text-slate',
                'transition-all duration-150 hover:border-vertex hover:text-vertex-deep active:rotate-180',
              )}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5.5 3v9.5M5.5 12.5L3 10M5.5 12.5L8 10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.5 13V3.5M10.5 3.5L8 6M10.5 3.5L13 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <AmountPanel
            side="out"
            label="You receive"
            token={state.tokenOut}
            value={amountOutText}
            onSelectToken={() => openPicker('out')}
            balance={balanceOut}
            hint={priceHint}
            isLoading={quote.isPending || quote.isFetching}
            readOnly
          />

          <QuoteDetails
            route={quote.route}
            slippageBps={state.slippageBps}
            quoteDurationMs={quote.durationMs}
            blockNumber={quote.blockNumber}
            isFetching={quote.isFetching}
            chainId={routableChain}
            decimalsOut={state.tokenOut.decimals}
            symbolIn={state.tokenIn.symbol}
            symbolOut={state.tokenOut.symbol}
          />

          <ActionButton
            isConnected={isConnected}
            hasAmount={Boolean(amountInRaw && amountInRaw > 0n)}
            invalidAmount={invalidAmount}
            exceedsBalance={Boolean(exceedsBalance)}
            balanceIn={balanceIn}
            tokenIn={state.tokenIn}
            route={quote.route}
            emptyReason={quote.emptyReason}
            quoteError={quote.error}
            routableChain={routableChain}
            chainId={chainId}
            stage={execution.stage}
            needsApproval={execution.needsApproval}
            isBusy={execution.isBusy}
            error={execution.error}
            onConnect={connect.show}
            onApprove={() => void execution.approve()}
            onSwap={() => void execution.swap()}
          />

          {lastSwap && !state.amountIn && quote.route === null ? (
            <p className="mt-3 rounded-panels bg-vertex-tint px-3 py-2 text-body-sm text-vertex-ink">
              Last swap: {lastSwap.amountIn} {state.tokenIn.symbol} → {lastSwap.amountOut} {state.tokenOut.symbol}
            </p>
          ) : null}
        </div>
      </div>

      <TokenSelectDialog
        open={tokenPicker.open}
        onClose={tokenPicker.hide}
        onSelect={handleSelect}
        selected={pickerSide.current === 'in' ? state.tokenIn : state.tokenOut}
        side={pickerSide.current}
      />

      <SwapSettingsDialog
        open={settings.open}
        onClose={settings.hide}
        slippageBps={state.slippageBps}
        deadlineMinutes={state.deadlineMinutes}
        onSlippageChange={setSlippageBps}
        onDeadlineChange={setDeadlineMinutes}
      />

      <ConnectDialog open={connect.open} onClose={connect.hide} />
    </div>
  )
}

function isDollarish(token: XToken): boolean {
  return ['USDC', 'USDT', 'DAI'].includes(token.symbol)
}

/**
 * One button, many honest states. The system allows a single filled action, so
 * every phase of the trade is expressed through this control.
 */
function ActionButton({
  isConnected,
  hasAmount,
  invalidAmount,
  exceedsBalance,
  balanceIn,
  tokenIn,
  route,
  emptyReason,
  quoteError,
  routableChain,
  chainId,
  stage,
  needsApproval,
  isBusy,
  error,
  onConnect,
  onApprove,
  onSwap,
}: {
  isConnected: boolean
  hasAmount: boolean
  invalidAmount: boolean
  exceedsBalance: boolean
  balanceIn: bigint | undefined
  tokenIn: XToken
  route: ReturnType<typeof useRouteQuote>['route']
  emptyReason: 'no-amount' | 'no-route' | null
  quoteError: Error | null
  routableChain: number | undefined
  chainId: number | undefined
  stage: ReturnType<typeof useSwapExecution>['stage']
  needsApproval: boolean
  isBusy: boolean
  error: string | null
  onConnect: () => void
  onApprove: () => void
  onSwap: () => void
}) {
  // Not connected
  if (!isConnected) {
    return (
      <Button size="lg" fullWidth onClick={onConnect} className="mt-3">
        Connect wallet
      </Button>
    )
  }

  // Wrong network
  if (chainId !== undefined && !routableChain) {
    return (
      <div className="mt-3 rounded-buttons border border-crimson/30 bg-crimson/5 px-4 py-3 text-center text-body-sm text-crimson">
        XSwap cannot route on {shortChainName(chainId)}. Switch to Ethereum, Arbitrum, Base or OP.
      </div>
    )
  }

  // No balance yet
  if (balanceIn === undefined && !hasAmount) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        Enter an amount
      </Button>
    )
  }

  if (invalidAmount) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        Check the amount format
      </Button>
    )
  }

  if (!hasAmount) {
    const zeroBalance = balanceIn !== undefined && balanceIn === 0n
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        {zeroBalance ? `No ${tokenIn.symbol} in this wallet` : 'Enter an amount'}
      </Button>
    )
  }

  if (exceedsBalance) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        Insufficient {tokenIn.symbol} balance
      </Button>
    )
  }

  if (quoteError) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        Quote unavailable — retrying
      </Button>
    )
  }

  if (emptyReason === 'no-route' || !route) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" disabled>
        No pool for this pair on {shortChainName(routableChain)}
      </Button>
    )
  }

  if (error) {
    return (
      <Button size="lg" fullWidth variant="soft" className="mt-3" onClick={needsApproval ? onApprove : onSwap}>
        {needsApproval ? 'Retry approval' : 'Retry swap'}
      </Button>
    )
  }

  if (stage === 'pending') {
    return (
      <Button size="lg" fullWidth loading className="mt-3">
        Confirming on-chain…
      </Button>
    )
  }

  if (stage === 'awaiting-signature' || stage === 'simulating') {
    return (
      <Button size="lg" fullWidth loading className="mt-3">
        {stage === 'simulating' ? 'Simulating…' : needsApproval ? 'Check your wallet' : 'Check your wallet'}
      </Button>
    )
  }

  if (needsApproval) {
    return (
      <Button size="lg" fullWidth className="mt-3" onClick={onApprove} loading={isBusy}>
        Approve {tokenIn.symbol}
      </Button>
    )
  }

  return (
    <Button size="lg" fullWidth className="mt-3" onClick={onSwap} loading={isBusy}>
      Swap {tokenIn.symbol}
    </Button>
  )
}