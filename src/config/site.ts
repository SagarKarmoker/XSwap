/** Site-wide constants that are not chain-specific. */

/** Where the app is deployed. Linked from the nav and footer. */
export const LIVE_URL = 'https://xswap.netlify.app/'

export const SITE_NAME = 'XSwap'
export const SITE_TAGLINE = 'Swap any token X for any token Y'
export const SITE_DESCRIPTION =
  'XSwap routes a trade across every live Uniswap v3 pool for the pair, quotes it with the chain’s own math, and settles it through SwapRouter02 — on Ethereum, Arbitrum, Base and OP.'

/** Attribution shown in the footer. */
export const COPYRIGHT = `© ${new Date().getFullYear()} Sagar Karmoker and XSwap`