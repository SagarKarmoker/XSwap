import type { Address } from 'viem'
import type { SupportedChainId } from './chains'

/**
 * Asset taxonomy from the reference design system, repurposed as a *token
 * identity* palette: it colours token marks, never buttons or surfaces. The
 * greenish tech brand hue is deliberately absent from this set so token colour
 * can never be mistaken for the accent.
 */
export type TokenCategory =
  | 'stable'
  | 'eth'
  | 'btc'
  | 'defi'
  | 'meme'
  | 'exchange'
  | 'gaming'
  | 'oracle'
  | 'yield'
  | 'governance'

export const categoryColor: Record<TokenCategory, string> = {
  stable: '#00c3a0',
  eth: '#8251fb',
  btc: '#ff4d00',
  defi: '#2abdff',
  meme: '#a3e635',
  exchange: '#f50db4',
  gaming: '#ff4d00',
  oracle: '#2abdff',
  yield: '#00c3a0',
  governance: '#f5e663',
}

export type XToken = {
  chainId: SupportedChainId
  address: Address
  symbol: string
  name: string
  decimals: number
  category: TokenCategory
  /**
   * On-chain symbols the contract may report that still map to `symbol`.
   * The bridged Tether on Arbitrum, for example, calls itself `USD₮0`.
   */
  symbolAliases?: string[]
  /** Lower-cased, order-preserving hint for the picker. */
  featured?: boolean
}

/**
 * Curated markets per chain, ordered by depth: the first tokens are the ones
 * the markets table shows, and they are the deepest pairs on each network.
 *
 * Addresses come from the official Uniswap / CoinGecko token lists and every
 * entry was verified on-chain for symbol and decimals — but the list is only a
 * *shortcut*. The picker resolves any ERC-20 address live, so a token missing
 * here is still swappable.
 */
export const tokensByChain: Record<SupportedChainId, XToken[]> = {
  1: [
    { chainId: 1, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, category: 'eth', featured: true },
    { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, category: 'stable', featured: true },
    { chainId: 1, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai', decimals: 18, category: 'stable' },
    { chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, category: 'btc', featured: true },
    { chainId: 1, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18, category: 'exchange', featured: true },
    { chainId: 1, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'Chainlink', decimals: 18, category: 'oracle' },
    { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, category: 'stable' },
    { chainId: 1, address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, category: 'eth' },
    { chainId: 1, address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', name: 'Aave', decimals: 18, category: 'defi' },
    { chainId: 1, address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', symbol: 'LDO', name: 'Lido DAO', decimals: 18, category: 'defi' },
    { chainId: 1, address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', name: 'Curve DAO', decimals: 18, category: 'defi' },
    { chainId: 1, address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP', name: 'Compound', decimals: 18, category: 'defi' },
    { chainId: 1, address: '0x808507121B80c02388fAd14726482e061B8da827', symbol: 'PENDLE', name: 'Pendle', decimals: 18, category: 'yield' },
    { chainId: 1, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', symbol: 'PEPE', name: 'Pepe', decimals: 18, category: 'meme' },
    { chainId: 1, address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', symbol: 'SUSHI', name: 'Sushi', decimals: 18, category: 'exchange' },
    { chainId: 1, address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX', name: 'Synthetix', decimals: 18, category: 'governance' },
  ],
  42161: [
    { chainId: 42161, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, category: 'eth', featured: true },
    { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6, category: 'stable', featured: true },
    { chainId: 42161, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18, category: 'governance', featured: true },
    { chainId: 42161, address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, category: 'btc', featured: true },
    { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, category: 'stable', symbolAliases: ['USD₮0'] },
    { chainId: 42161, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai', decimals: 18, category: 'stable' },
    { chainId: 42161, address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', name: 'Chainlink', decimals: 18, category: 'oracle' },
    { chainId: 42161, address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', symbol: 'GMX', name: 'GMX', decimals: 18, category: 'defi' },
    { chainId: 42161, address: '0x3082CC23568eA640225c2467653dB90e9250AaA0', symbol: 'RDNT', name: 'Radiant', decimals: 18, category: 'defi' },
    { chainId: 42161, address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', symbol: 'UNI', name: 'Uniswap', decimals: 18, category: 'exchange' },
  ],
  8453: [
    { chainId: 8453, address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, category: 'eth', featured: true },
    { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, category: 'stable', featured: true },
    { chainId: 8453, address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', decimals: 8, category: 'btc', featured: true },
    { chainId: 8453, address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', name: 'Aerodrome', decimals: 18, category: 'defi' },
    { chainId: 8453, address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai', decimals: 18, category: 'stable' },
    { chainId: 8453, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', name: 'Tether USD', decimals: 6, category: 'stable' },
    { chainId: 8453, address: '0x63706e401c06ac8513145b7687A14804d17f814b', symbol: 'AAVE', name: 'Aave', decimals: 18, category: 'defi' },
    { chainId: 8453, address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', symbol: 'VIRTUAL', name: 'Virtuals Protocol', decimals: 18, category: 'gaming' },
  ],
  10: [
    { chainId: 10, address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, category: 'eth', featured: true },
    { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6, category: 'stable', featured: true },
    { chainId: 10, address: '0x4200000000000000000000000000000000000042', symbol: 'OP', name: 'Optimism', decimals: 18, category: 'governance', featured: true },
    { chainId: 10, address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, category: 'btc', featured: true },
    { chainId: 10, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai', decimals: 18, category: 'stable' },
    { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD', decimals: 6, category: 'stable' },
    { chainId: 10, address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', symbol: 'LINK', name: 'Chainlink', decimals: 18, category: 'oracle' },
    { chainId: 10, address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691', symbol: 'UNI', name: 'Uniswap', decimals: 18, category: 'exchange' },
    { chainId: 10, address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, category: 'eth' },
    { chainId: 10, address: '0xBC7B1Ff1c6989f006a1185318eD4E7b5796e66E1', symbol: 'PENDLE', name: 'Pendle', decimals: 18, category: 'yield' },
  ],
}

export type ResolvedToken = XToken

/** Tokens curated for the connected chain (falls back to Ethereum). */
export function listTokens(chainId: number | undefined): XToken[] {
  if (chainId && chainId in tokensByChain) return tokensByChain[chainId as SupportedChainId]
  return tokensByChain[1]
}

export function findTokenByAddress(chainId: number, address: string): XToken | undefined {
  return listTokens(chainId).find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  )
}

export function findTokenBySymbol(chainId: number, symbol: string): XToken | undefined {
  return listTokens(chainId).find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase(),
  )
}

export function totalIndexedTokens(): number {
  return Object.values(tokensByChain).reduce((total, tokens) => total + tokens.length, 0)
}

/** Deterministic mark colour + glyph so tokens never need an image request. */
export function tokenMark(token: Pick<XToken, 'symbol' | 'category'>): { color: string; glyph: string } {
  const color = categoryColor[token.category]
  const glyph = token.symbol.replace(/^[$]/, '').slice(0, 2).toUpperCase()
  return { color, glyph }
}