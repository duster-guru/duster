# Duster

> Solana wallet dust cleaner. Sweep micro-balance SPL tokens to USDC or SOL and reclaim rent — all in one signature.

**Live:** [duster.guru](https://duster.guru) · **App:** [duster.guru/app](https://duster.guru/app)

---

## What is "dust"?

On Solana, your wallet doesn't hold tokens directly. Every SPL token mint you've ever received gets its own per-wallet **token account**, and each one locks ~`0.002 SOL` of rent to exist. Over time wallets accumulate dozens of these accounts holding tiny balances — airdrops, leftover swap dust, memecoin scraps — each one too small to trade individually but collectively meaningful.

Duster finds every dust token in your wallet, swaps them to USDC or SOL via the Jupiter aggregator, and closes the emptied accounts so you get the locked rent back too. **One wallet signature, atomic batch transaction, non-custodial.**

## Features

- **Real-time dust scan** — reads all SPL token accounts and prices them through Jupiter's `lite-api`.
- **Three output paths** — USDC (5% fee), native SOL (4% fee), and DUST token (3% fee, coming soon).
- **Self-collected platform fee** — `transferChecked` ix appended to each swap so fee math is exact and independent of Jupiter's broken `feeAccount` path.
- **Rent reclaim** — `closeAccount` ix on every emptied source ATA refunds locked SOL.
- **Atomic transaction batch** — Jupiter swap-instructions composed into v0 versioned txs, packed under the 1232-byte limit.
- **One signature** — `signAllTransactions` covers the whole batch.
- **Local sweep history** — per-wallet records persisted in `localStorage`, keyed by pubkey.
- **Live portfolio chart** — top-5 holdings + "Other" aggregate, derived from the same scan.
- **Trust signals built in** — Solscan deep-links on every sweep, on-chain balance delta on success, non-custodial throughout.
- **Mobile-first** — designed for one-thumb operation; the in-app phone-frame UI runs identically on desktop.

## Tech

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, Tailwind, Framer Motion |
| Routing | React Router v6, path-based (`/` static homepage + `/app/*` lazy chunk) |
| Wallet | `@solana/wallet-adapter-react` + Phantom / Solflare / Backpack |
| Chain interaction | `@solana/web3.js`, `@solana/spl-token`, Jupiter `lite-api/swap/v1` |
| Analytics | Cloudflare Web Analytics (opt-in via env var) |
| Hosting | Static site (Cloudflare Pages / Vercel / any static host) |

## Quick start

```bash
cd sweep-app
cp .env.example .env.local  # populate Solana RPC URL (Helius recommended)
npm install
npm run dev                  # http://localhost:5173
npm run build                # production bundle in dist/
```

### Required env

```
VITE_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Optional env

```
VITE_SWEEP_MINT=<dust-token-mint>           # enables the third output card; locked "Coming soon" until token launches
VITE_SWEEP_USD_REF=0.10                     # display price for the dust token before there's a Jupiter market
VITE_FEE_AUTHORITY=<base58-pubkey>          # platform fee collector; ATAs owned by this pubkey must exist on-chain
VITE_CF_ANALYTICS_TOKEN=<cloudflare-token>  # enables Cloudflare Web Analytics beacon (proxy mode is zero-config)
```

## Architecture

```
src/
├── main.jsx              # entry: BrowserRouter + lazy AppRoot, analytics init
├── Home.jsx              # marketing homepage at /  (no wallet SDK)
├── AppRoot.jsx           # lazy boundary — drags in Solana SDK only when /app/* is visited
├── App.jsx               # in-app screen state machine
├── screens/              # Splash, Connect, Scan, Results, Cleaning, Success, Share, Dashboard
├── hooks/
│   ├── useDustScan.js    # RPC fetch → Jupiter price → metadata → classify
│   └── useSweepExecution.js  # build v0 tx → signAllTransactions → send + confirm
├── lib/solana/
│   ├── jupiter.js        # quote + swap-instructions fetches w/ AbortController timeout
│   ├── txBuilder.js      # composes v0 VersionedTransactions per token, packed
│   ├── tokenAccounts.js  # SPL Token + Token-2022 account reads
│   ├── pricing.js        # Jupiter Price v3 batched, 100 mints per call
│   └── tokenList.js      # Jupiter Tokens v2 metadata search
├── lib/
│   ├── history.js        # per-pubkey sweep history in localStorage
│   ├── analytics.js      # opt-in Cloudflare beacon injection
│   └── polyfills.js      # Buffer polyfill (Solana SDK reads it at module init)
└── components/           # PortfolioChart, HomeNav, VersionBadge, UI primitives
```

Path-based code split keeps the homepage at ~80KB gzip; the wallet SDK + every app screen + Framer Motion are lazy-loaded only when the user navigates to `/app`.

## Security

- Non-custodial — Duster never sees seed phrases or private keys.
- The frontend signs only three kinds of on-chain instruction: a Jupiter swap, an SPL transfer for the platform fee, and a `closeAccount` call to refund rent.
- Swap routing goes through Jupiter, which has been audited by OtterSec, Halborn, and others.
- Frontend source is open here — read it before signing anything.
- Disclosure: see [SECURITY.md](SECURITY.md) (coming soon) or email security@duster.guru.

## Status

**Beta · Solana mainnet · v0.1.x**

Active rollout. The DUST loyalty token, leaderboard, cross-device history sync, and KOL referral codes are tracked in [PRODUCT_NEXT_STEPS.md](PRODUCT_NEXT_STEPS.md).

## License

TBD — pending. The frontend is currently source-available for inspection. Do not redistribute or fork commercially without permission until a license is published.

---

Built with care for the Solana ecosystem.
