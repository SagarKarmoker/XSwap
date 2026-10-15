# XSwap

**Swap any token X for any token Y.** XSwap is a swap interface that quotes and settles trades on Uniswap v3 across
Ethereum, Arbitrum, Base and OP — with a green/jade take on the reference design system in [`design.md`](./design.md).

Nothing is mocked. Every number on screen — rates, price impact, minimum received, pool fee tiers, mid prices, the block
a quote was read at — comes from a JSON-RPC read against the chain you are connected to.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # typecheck + production bundle
pnpm preview      # serve the production build
pnpm check:deployments   # prove every factory/quoter/router address still routes
```

No API keys are required. The app falls back to public RPCs; see [Environment](#environment) if you want your own.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 6 + TypeScript (strict, `noUnusedLocals`, `verbatimModuleSyntax`) | fast HMR, smallest config surface |
| UI | React 18 | |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite`, tokens in `@theme` | design system lives in one CSS file, no config file |
| Chain | **viem 2.57** | all contract reads, encoding, formatting |
| Wallets | **wagmi 3** + `@tanstack/react-query` | React bindings over viem: connections, mutations, query cache |
| Wallets | `@walletconnect/ethereum-provider`, `@coinbase/wallet-sdk` | optional connectors, dynamically imported |
| Type | Inter Variable (`@fontsource-variable/inter`) | open-source stand-in for Basel, variable so the 485/535 mid-weights interpolate |

> **Why wagmi on top of viem?** In current `viem`, the React layer was split out: `viem` is clients/actions only, and
> `wagmi` owns `createConfig`, the connectors and the hooks. The app never calls `viem` clients directly for reads —
> `src/lib/router.ts` takes a *read function* so it is decoupled from whichever client produces it.

---

## How the routing engine works

`src/lib/router.ts` is the whole engine, and it has three steps.

**1. Discover pools — no hardcoded pool addresses.**
The Uniswap v3 factory exposes `getPool(tokenA, tokenB, fee)`. Asking the chain is the only way to support *any* ERC-20
pair, including a long-tail token nobody has curated. (CREATE2 derivation from an init-code hash was tried and
discarded: a single wrong hash silently produces addresses with no code.)

```
getPool(WETH, USDC, 100 | 500 | 3000 | 10000)  →  pool or 0x0
```

**2. Read pool state.** `slot0()` gives `sqrtPriceX96` and `tick`; `liquidity()` and `token0()` come alongside. The mid
price is derived in BigInt-safe maths:

```
midPrice(tokenOut per tokenIn) = (sqrtPriceX96² / 2¹⁹²) × 10^(decimalsIn − decimalsOut)
```

with the direction flipped when the input token is `token1` rather than `token0`. Both cases occur in practice — on
Ethereum the USDC/WETH pool has `token0 = USDC`, on Arbitrum the same pair is token-inverted.

**3. Quote through every live pool.** Each fee tier is quoted by the chain's own Quoter (`Quoter` on Ethereum, `QuoterV2`
elsewhere — flat vs. struct ABI), and the highest output wins. Quotes refresh every 20 s and keep the previous value on
screen while the next one is in flight.

Price impact is measured against the mid price **after** the LP fee, so the number a user sees is depth impact rather
than a re-labelled fee.

```
impact = (amountIn × midPrice × (1 − fee) − amountOut) / (amountIn × midPrice × (1 − fee))
```

### Settlement

The swap button is a real transaction path:

1. `simulateContract` on the ERC-20 `approve` for exactly the quoted amount → a doomed approval fails in the UI with a
   readable reason instead of an opaque wallet rejection.
2. `SwapRouter02.exactInputSingle` with `amountOutMinimum = quote × (1 − slippage)` and a deadline. Your slippage
   setting is enforced by the router, not by a promise in the UI.
3. `waitForTransactionReceipt` → success toast with an explorer link, balances refreshed.

---

## Wallet connection

| Capability | Implementation |
|---|---|
| Wallet discovery | `injected({ shimDisconnect: true })` + `multiInjectedProviderDiscovery` (EIP-6963) — every installed extension appears by name, not just `window.ethereum` |
| Coinbase Wallet | `coinbaseWallet()` (SDK, dynamic import) |
| WalletConnect | `walletConnect()`, registered only when `VITE_WALLETCONNECT_PROJECT_ID` is set |
| Preview | `mock()` connector — read-only wallet with real balances and live quotes, so the UI can be reviewed with no extension installed. It says so when you try to sign. |
| Chain switching | Four supported networks, switcher in the nav and the account menu; unsupported networks raise a persistent banner with a one-click fix |
| Identity | ENS name + avatar when available, copyable address, explorer link |
| Balances | ERC-20 multicall for the panels, native balance in the account menu |
| Sign in | SIWE-style message with a local nonce, signature kept in local storage; no transaction, no gas |
| Resilience | auto-reconnect on mount, address/chain/connection watching, `shimDisconnect` for wallets that cannot disconnect programmatically |

---

## Design system

`src/styles/index.css` holds the whole system as Tailwind v4 `@theme` tokens, so `text-heading-lg`, `rounded-cards`,
`tracking-body`, `font-w535`, `bg-vertex-deep` and friends are all generated utilities.

The accent hue is rotated from the reference system's hot pink to jade, keeping everything else intact:

| Token | Value | Role |
|---|---|---|
| `--color-vertex` | `#00e0a4` | logo, orbs, active nav indicator, focus |
| `--color-vertex-deep` | `#007a54` | the single filled CTA — dark enough to carry white text (5.4:1) |
| `--color-vertex-tint` | `#e9fbf4` | soft second-level surfaces |
| neutrals | `#131313` `#222222` `#6a6a6a` `#acacac` `#f2f2f2` `#ffffff` | unchanged from the reference |
| taxonomy | ember, iris, magenta, sky, mint, lime, lemon | **token identity only** — never a UI accent, never a button |

Deliberately preserved from the reference: white canvas, 1px hairline borders instead of shadows (one near-invisible
`10% black / 10px blur` is the only elevation), 20px radii, `-0.02em` tracking on every size, the mid-weight type ladder
(485/535) rather than the usual 400/600, exactly one filled button per screen, and heavily-blurred colour orbs with a
faint dot grid as the only atmosphere. Token marks are drawn, never fetched — no logo CDN, no image requests.

---

## Environment

Copy `.env.example` to `.env` if you need anything; all of it is optional.

| Variable | Effect |
|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | enables the WalletConnect connector (QR / deep link) |
| `VITE_RPC_ETHEREUM` / `_ARBITRUM` / `_BASE` / `_OPTIMISM` | replaces the public RPC for that chain |

Defaults are public endpoints wrapped in a `fallback` transport, so one slow node does not fail a quote.

---

## Layout

```
src/
├── config/        chains + verified DEX deployments, curated token registry, env
├── lib/           router engine, ABIs, wagmi config, formatting, explorer links
├── hooks/         quotes, token metadata/balances/allowance, execution, UI helpers
├── state/         swap form state (context), toasts
├── components/
│   ├── brand/     logo, decorative orbs, dot-grid backdrop
│   ├── layout/    nav + ⌘K command palette, footer
│   ├── swap/      swap card, amount panels, token picker, settings, quote details
│   ├── wallet/    connect dialog, account menu, chain switcher, sign-in
│   ├── sections/  hero, markets, how-it-works
│   └── ui/        buttons, dialog, popover, card, token icon, spinner
└── scripts/       check-deployments.mts
```

---

## Known limits

- **Single-hop, Uniswap v3 only.** Quotes come from the deployed Quoter, which supports single-pool exact-input. A
  multi-hop path would need `QuoterV2.quoteExactInput` and a router `exactInput` call; the engine is shaped for it
  (`Route` carries the pool, the fee and the tick) but does not implement it.
- **ERC-20 in, ERC-20 out.** Native ETH would need a wrap/unwrap leg around the router call; WETH is listed instead.
- **Pools are per-fee-tier.** Uniswap v2 liquidity is not quoted — the mainnet v2 USDC/WETH pair is effectively drained,
  so including it would make quotes worse, not better.
- **No indexer.** The markets table shows live pool state, not 24h volume or TVL, because nothing here can prove those
  numbers without a paid data source.

## Not affiliated with Uniswap Labs