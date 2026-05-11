# Duster — Next steps that need you

Items from the product-design audit that **require human/business action**, not code changes. Tick boxes as you go.

---

## 🚀 Distribution (free traffic from existing crypto users)

- [ ] **Submit Duster to Phantom Discover.** Phantom's in-app dapp directory. Apply at https://phantom.com/learn/builders or submit via their Discord. Once approved, every Phantom mobile user can discover Duster from inside the wallet. Expected: hundreds of free users/day post-listing.
- [ ] **Submit Duster to Solflare Marketplace.** Same as Phantom but for Solflare. https://solflare.com/builders (or contact through Discord).
- [ ] **Submit Duster to Backpack xNFT directory.** Smaller userbase, but Backpack users skew technical.
- [ ] **PR to `awesome-solana`.** Add Duster to https://github.com/StockpileLabs/awesome-solana under "Tools" or "DeFi". PRs are usually merged within a week.
- [ ] **Submit to `SolanaCompass`.** https://solanacompass.com/projects — fill the submission form.
- [ ] **Submit to `DappRadar`.** Cross-chain dapp discovery; counts toward "trending" metrics.
- [ ] **Solana Foundation grants form.** If you want a small ecosystem grant: https://solana.org/grants

## 📢 Marketing (KOL + crypto Twitter)

- [ ] **Draft a "first 10 users" tweet thread** explaining what dust is, why wallets accumulate it, and Duster's one-signature angle. Save in `marketing/launch-thread.md` (not yet created).
- [ ] **Build a list of 20 Solana KOLs** (mid-tier, 5k–50k followers — better engagement than mega-accounts) to DM with a personalised "sweep your own wallet first, here's $X you found" angle.
- [ ] **Create a 15-second screen-recording demo** of a real sweep — quote → results → clean → success. Loop it on Twitter, Discord, the marketing page.
- [ ] **Reach out to wallet teams** (Phantom, Solflare, Backpack) about a native "Sweep with Duster" button in their dust-token UI. They take a rev share; you get distribution.
- [ ] **Schedule a Solana Discord/Twitter Space** to demo the app live and answer questions.

## ⚙️ Backend / infra (unstash sweep-api when ready)

The backend has been built and stashed at `git stash@{0}: backend: nestjs proxy + caddy/nginx deploy`. Recovering it unlocks the items below.

- [ ] **`git stash pop`** the backend, host it (Fly/Railway/your VPS via the included Caddy stack), and switch the frontend to call `/api/v1/*` instead of public Jupiter/Helius. Removes the Helius key from the browser bundle.
- [ ] **Implement referral codes.** Backend persists `(referrer_pubkey, referee_pubkey, swept_usd)` rows. Share URL becomes `https://duster.guru/r/<short_code>`. Pay referrer 0.5% rebate of fees their referees generate. This is the single biggest growth lever for an on-chain product.
- [ ] **Implement DUST waitlist.** When user taps the "Coming soon" DUST card, POST `{wallet_pubkey, email?}` to the backend and display the live count. Pre-warms the audience for token launch.
- [ ] **Implement leaderboard.** Public board of top wallets by cumulative swept USD. Solana culture loves these; expect 3–5× retention bump for top-50 wallets.

## 💸 Monetisation / token-economy decisions

- [ ] **Create the SOL and DUST fee ATAs on-chain.** USDC is already live (`12bdmvcU5aCWJkzv7YSeN7Z7r3sWDbazaQNs5nAh232r`). Send a tiny amount of WSOL (`9Jm5oS2eMBtri9YuczoQLgXZKdGSjaVNJxXK8E478aCW`) and JUP/DUST (`3TjuWLCm9pn7eYNfh78X2pzBga8R858DpncjMwZUKzMj`) to `AdWRiL83TtWWnBBPaz4SuMzmsQkZt4kJrHhTF2a1EJ3U` to initialise those ATAs. Until then those output paths run fee-free.
- [ ] **Decide DUST token economics.** Supply, distribution, vesting, governance scope. Until decided, the "Coming soon" pill is the right framing.
- [ ] **Decide a sustainable fee floor.** Currently 5% USDC / 4% SOL. For sub-cent dust the fee covers nothing (network fee + ATA rent eat it). Consider a flat minimum (`max(feeBps, $0.005)`) once volume is meaningful.

## 🧪 Validation / audits (build trust)

- [ ] **Get a security audit** (Halborn, OtterSec, Soteria — request quotes). Even a "low-risk frontend" review you can quote on the marketing page meaningfully bumps Splash conversion.
- [ ] **Publish a one-page "How it works" page** at `duster.guru/how-it-works`. Lists every on-chain instruction Duster signs (swap, transfer, close), why each is needed, and what's NOT signed (token approvals, account upgrades, etc.).
- [ ] **Open-source the frontend.** Most reputable Solana utilities have public repos. Builds trust with the crypto-native subset of users.

## 📊 Analytics & feedback (after first real users)

- [ ] **Pick an analytics tool that doesn't break wallet privacy.** Plausible.io or Umami (self-hosted) — no IP retention, no user fingerprinting. Avoid Google Analytics for this use case.
- [ ] **Set up an error reporter.** Sentry's free tier is plenty for a launch. Hook into the existing exception filter on the backend + a frontend listener.
- [ ] **Create a Discord/Telegram for user feedback.** Pin the FAQ; let users report broken sweeps. Crypto users prefer Discord over email.

## 🎨 Brand polish (when there's time)

- [ ] **Commission a proper 1200×630 OG image** (current one is good, but a hand-designed version would be sharper).
- [ ] **Hire an illustrator for a hero animation** on a future marketing page — feather duster sweeping coins into a vault, or similar.
- [ ] **Buy `duster.so`, `duster.app`, `tryduster.com`** as defensive registrations if budget allows. Cloudflare Registrar = at-cost.

---

_Last updated: 2026-05-12. Tick items as you complete them; this file is just a checklist, not authoritative state._
