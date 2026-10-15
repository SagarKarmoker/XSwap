import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import '@fontsource-variable/inter'
import './styles/index.css'
import { wagmiConfig } from '@/lib/wagmi'
import { SwapProvider } from '@/state/swap-context'
import { ToastProvider } from '@/state/toast-context'
import { App } from './App'

/**
 * wagmi owns connection state; the query client behind it backs every on-chain
 * read (balances, pool state, quotes). Quotes refresh on an interval in the
 * hook itself, so the global defaults stay conservative.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function Root() {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <SwapProvider>
            <App />
          </SwapProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root is missing from index.html')

createRoot(container).render(<Root />)