import { createContext, useContext, useMemo, useReducer, useCallback, useState, type ReactNode } from 'react'
import type { XToken } from '@/config/tokens'
import { listTokens } from '@/config/tokens'
import { usePersistentState, useDebounced } from '@/hooks/use-debounced'
import { storage, STORAGE_KEYS } from '@/lib/utils'

export const DEFAULT_SLIPPAGE_BPS = 50
export const DEFAULT_DEADLINE_MINUTES = 20

export type SwapState = {
  tokenIn: XToken
  tokenOut: XToken
  /** Raw string so partially typed input ("0.", "1e" blocked) survives re-renders. */
  amountIn: string
  slippageBps: number
  deadlineMinutes: number
}

type Action =
  | { type: 'setTokenIn'; token: XToken }
  | { type: 'setTokenOut'; token: XToken }
  | { type: 'setAmountIn'; value: string }
  | { type: 'swapTokens' }
  | { type: 'setSlippage'; bps: number }
  | { type: 'setDeadline'; minutes: number }
  | { type: 'setChain'; chainId: number }

function reducer(state: SwapState, action: Action): SwapState {
  switch (action.type) {
    case 'setTokenIn': {
      if (action.token.address.toLowerCase() === state.tokenOut.address.toLowerCase()) {
        return { ...state, tokenIn: action.token, tokenOut: state.tokenIn, amountIn: '' }
      }
      return { ...state, tokenIn: action.token, amountIn: state.tokenIn.address === action.token.address ? state.amountIn : state.amountIn }
    }
    case 'setTokenOut': {
      if (action.token.address.toLowerCase() === state.tokenIn.address.toLowerCase()) {
        return { ...state, tokenOut: action.token, tokenIn: state.tokenOut, amountIn: '' }
      }
      return { ...state, tokenOut: action.token }
    }
    case 'setAmountIn':
      return { ...state, amountIn: action.value }
    case 'swapTokens':
      // The typed amount stays: the user is flipping X → Y, not losing input.
      return { ...state, tokenIn: state.tokenOut, tokenOut: state.tokenIn }
    case 'setSlippage':
      return { ...state, slippageBps: action.bps }
    case 'setDeadline':
      return { ...state, deadlineMinutes: action.minutes }
    case 'setChain': {
      const tokens = listTokens(action.chainId)
      const currentIn = state.tokenIn
      const nextIn = tokens.find((token) => token.symbol === currentIn.symbol) ?? tokens[0]
      const nextOut =
        tokens.find((token) => token.symbol === state.tokenOut.symbol && token.address !== nextIn?.address) ??
        tokens.find((token) => token.address !== nextIn?.address) ??
        tokens[1]
      if (!nextIn || !nextOut) return state
      return { ...state, tokenIn: nextIn, tokenOut: nextOut, amountIn: '' }
    }
    default:
      return state
  }
}

function initialState(): SwapState {
  const tokens = listTokens(storage.get(STORAGE_KEYS.recentChain) ? Number(storage.get(STORAGE_KEYS.recentChain)) : 1)
  const tokenIn = tokens.find((token) => token.symbol === 'WETH') ?? tokens[0]
  const tokenOut = tokens.find((token) => token.symbol === 'USDC') ?? tokens[1]

  return {
    tokenIn,
    tokenOut,
    amountIn: '',
    slippageBps: DEFAULT_SLIPPAGE_BPS,
    deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
  }
}

type SwapContextValue = {
  state: SwapState
  /** Debounced amount used as the quote input — keeps typing smooth. */
  debouncedAmountIn: string
  /** Round trip of the last successful quote, for the stats card. */
  lastQuoteMs: number
  reportQuote: (durationMs: number) => void
  setTokenIn: (token: XToken) => void
  setTokenOut: (token: XToken) => void
  setAmountIn: (value: string) => void
  swapTokens: () => void
  setSlippageBps: (bps: number) => void
  setDeadlineMinutes: (minutes: number) => void
  setChainTokens: (chainId: number) => void
}

const SwapContext = createContext<SwapContextValue | null>(null)

export function SwapProvider({ children }: { children: ReactNode }) {
  const [persistedSlippage, setPersistedSlippage] = usePersistentState<number>(
    STORAGE_KEYS.slippage,
    DEFAULT_SLIPPAGE_BPS,
  )
  const [persistedDeadline, setPersistedDeadline] = usePersistentState<number>(
    STORAGE_KEYS.deadline,
    DEFAULT_DEADLINE_MINUTES,
  )

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...initialState(),
    slippageBps: persistedSlippage,
    deadlineMinutes: persistedDeadline,
  }))

  const [lastQuoteMs, setLastQuoteMs] = useState(0)
  const reportQuote = useCallback((durationMs: number) => {
    // Keep the fastest recent reading; it is the number worth quoting.
    setLastQuoteMs((current) => (current === 0 ? durationMs : Math.min(current, durationMs)))
  }, [])

  const debouncedAmountIn = useDebounced(state.amountIn, 300)

  const setTokenIn = useCallback((token: XToken) => dispatch({ type: 'setTokenIn', token }), [])
  const setTokenOut = useCallback((token: XToken) => dispatch({ type: 'setTokenOut', token }), [])
  const setAmountIn = useCallback((value: string) => dispatch({ type: 'setAmountIn', value }), [])
  const swapTokens = useCallback(() => dispatch({ type: 'swapTokens' }), [])

  const setSlippageBps = useCallback(
    (bps: number) => {
      dispatch({ type: 'setSlippage', bps })
      setPersistedSlippage(bps)
    },
    [setPersistedSlippage],
  )

  const setDeadlineMinutes = useCallback(
    (minutes: number) => {
      dispatch({ type: 'setDeadline', minutes })
      setPersistedDeadline(minutes)
    },
    [setPersistedDeadline],
  )

  const setChainTokens = useCallback((chainId: number) => {
    storage.set(STORAGE_KEYS.recentChain, String(chainId))
    dispatch({ type: 'setChain', chainId })
  }, [])

  const value = useMemo<SwapContextValue>(
    () => ({
      state,
      debouncedAmountIn,
      lastQuoteMs,
      reportQuote,
      setTokenIn,
      setTokenOut,
      setAmountIn,
      swapTokens,
      setSlippageBps,
      setDeadlineMinutes,
      setChainTokens,
    }),
    [
      state,
      debouncedAmountIn,
      lastQuoteMs,
      reportQuote,
      setTokenIn,
      setTokenOut,
      setAmountIn,
      swapTokens,
      setSlippageBps,
      setDeadlineMinutes,
      setChainTokens,
    ],
  )

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>
}

export function useSwapState(): SwapContextValue {
  const context = useContext(SwapContext)
  if (!context) throw new Error('useSwapState must be used inside <SwapProvider>')
  return context
}