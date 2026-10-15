import { useEffect } from 'react'
import { useConnection } from 'wagmi'
import { NavBar } from '@/components/layout/nav-bar'
import { Footer } from '@/components/layout/footer'
import { Hero } from '@/components/sections/hero'
import { Markets } from '@/components/sections/markets'
import { HowItWorks } from '@/components/sections/how-it-works'
import { NetworkBanner } from '@/components/wallet/chain-menu'
import { useSwapState } from '@/state/swap-context'
import { isSupportedChain } from '@/config/chains'

export function App() {
  const { chainId } = useConnection()
  const { setChainTokens, state } = useSwapState()

  // Keep the token universe in step with the wallet's network, without yanking
  // the user's selection around when they switch back and forth.
  useEffect(() => {
    if (chainId && isSupportedChain(chainId) && state.tokenIn.chainId !== chainId) {
      setChainTokens(chainId)
    }
  }, [chainId, setChainTokens, state.tokenIn.chainId])

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <NetworkBanner />
      <NavBar />

      <main className="flex-1">
        <Hero />

        <div className="mx-auto flex max-w-[1200px] flex-col gap-[80px] px-4 sm:px-6">
          <Markets />
          <HowItWorks />
        </div>
      </main>

      <Footer />
    </div>
  )
}