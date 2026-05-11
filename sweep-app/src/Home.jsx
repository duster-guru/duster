import { Link } from "react-router-dom";

/**
 * Marketing homepage at `/`. Mobile-first single column that scrolls,
 * deliberately:
 *   - NO wallet SDK imports (would defeat the lazy split)
 *   - NO framer-motion (lives in the lazy app chunk)
 *   - NO heavy custom components
 *   - just Tailwind + the favicon + plain SVG dust motes for ambient feel
 *
 * Sections (in scroll order):
 *   1. Hero      — logo, headline, primary CTA, trust strip
 *   2. Dust       — what dust is + why wallets accumulate it
 *   3. How it works — connect / scan / clean three-step
 *   4. Why Duster — feature row (one signature, mobile, non-custodial, transparent)
 *   5. FAQ        — six core questions
 *   6. Footer     — duster.guru, version pill, links
 */
export default function Home() {
  return (
    <div className="min-h-dvh w-full bg-void text-text-primary">
      {/* ambient gradient — pure CSS, no JS particles */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 0%, rgba(168,85,247,0.10) 0%, transparent 60%), radial-gradient(ellipse 600px 400px at 50% 100%, rgba(71,191,255,0.06) 0%, transparent 60%)",
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-[440px] px-5 pt-12 pb-10 sm:max-w-[640px] sm:px-8">
        {/* ---- 1. HERO ---- */}
        <section className="flex flex-col items-center text-center min-h-[88dvh] pt-4">
          {/* Hexagon-framed favicon, matches the in-app splash */}
          <div
            className="w-[112px] h-[124px] flex items-center justify-center"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              background:
                "linear-gradient(135deg, rgba(134,59,255,0.40), rgba(71,191,255,0.20))",
            }}
          >
            <div
              className="w-[104px] h-[116px] flex items-center justify-center bg-surface"
              style={{
                clipPath:
                  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            >
              <img
                src="/favicon.svg"
                alt="Duster logo"
                width={56}
                height={56}
                style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.55))" }}
              />
            </div>
          </div>

          <h1 className="mt-7 font-display text-[40px] sm:text-[48px] font-bold tracking-[0.32em]">
            DUSTER
          </h1>

          <p className="mt-4 text-[18px] sm:text-[20px] leading-snug text-text-secondary max-w-[300px]">
            Find the hidden money<br />in your Solana wallet.
          </p>

          <Link
            to="/app"
            className="mt-8 inline-flex items-center justify-center gap-2 h-[56px] px-7 rounded-full bg-sweep text-void font-display font-bold text-[16px] shadow-cta"
          >
            Open Duster
            <span aria-hidden>→</span>
          </Link>

          <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted font-mono">
            <span className="inline-flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-success"
                style={{ boxShadow: "0 0 6px #34E1A2" }}
              />
              Solana mainnet
            </span>
            <span className="opacity-40">·</span>
            <span>Non-custodial</span>
            <span className="opacity-40">·</span>
            <span>One signature</span>
          </div>

          <div className="mt-12 text-text-muted text-[12px]">
            ↓ scroll
          </div>
        </section>

        {/* ---- 2. WHAT'S DUST ---- */}
        <section className="mt-16 sm:mt-24">
          <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-sweep">
            The hidden money
          </h2>
          <h3 className="mt-3 font-display text-[28px] sm:text-[34px] font-bold leading-tight">
            Every Solana wallet collects dust.
          </h3>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-text-secondary">
            Airdrops you forgot. Leftovers from old swaps. Memecoin scraps. Each one too small to trade by itself, but together they add up — and every one locks <span className="text-gold font-semibold">~0.002 SOL of rent</span> the network won't refund unless you close the account.
          </p>
          <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed text-text-secondary">
            Duster finds every dust token in your wallet, swaps them to USDC or SOL via Jupiter, and closes the emptied accounts so you get that rent back too. <span className="text-text-primary font-semibold">All in one wallet signature.</span>
          </p>
        </section>

        {/* ---- 3. HOW IT WORKS ---- */}
        <section className="mt-16 sm:mt-24">
          <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-sweep">
            How it works
          </h2>
          <ol className="mt-5 flex flex-col gap-4">
            {[
              {
                n: "1",
                t: "Connect",
                d: "Phantom, Solflare, or Backpack. We never see your seed. Wallet stays in your control.",
              },
              {
                n: "2",
                t: "Scan",
                d: "We read every SPL token account, price each one via Jupiter, and surface the ones below $5.",
              },
              {
                n: "3",
                t: "Clean",
                d: "Pick USDC or SOL as the output. One signature swaps the dust, transfers the platform fee, and closes the empty accounts — atomically.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="flex gap-4 rounded-md p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-[16px] shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(168,85,247,0.30), rgba(71,191,255,0.20))",
                    border: "1px solid rgba(168,85,247,0.40)",
                  }}
                >
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[16px]">
                    {s.t}
                  </div>
                  <div className="text-[14px] mt-1 text-text-secondary leading-snug">
                    {s.d}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- 4. WHY DUSTER ---- */}
        <section className="mt-16 sm:mt-24">
          <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-sweep">
            Why Duster
          </h2>
          <h3 className="mt-3 font-display text-[26px] sm:text-[30px] font-bold leading-tight">
            Built for one-tap cleanup.
          </h3>
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: "⚡", t: "One signature", d: "Not one per token. One." },
              { icon: "📱", t: "Mobile-first", d: "Designed for your phone, not retrofitted." },
              { icon: "🔒", t: "Non-custodial", d: "Your keys, your wallet, your funds." },
              { icon: "💸", t: "Transparent fee", d: "5% to USDC, 4% to SOL. No surprises." },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-md p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-[20px]">{f.icon}</div>
                <div className="mt-2 font-display font-bold text-[14px]">
                  {f.t}
                </div>
                <div className="text-[12px] mt-1 text-text-secondary leading-snug">
                  {f.d}
                </div>
              </div>
            ))}
          </ul>
        </section>

        {/* ---- 5. FAQ ---- */}
        <section className="mt-16 sm:mt-24">
          <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-sweep">
            Common questions
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {[
              {
                q: "Is it safe?",
                a: "Duster only signs three kinds of on-chain instruction: a Jupiter swap, an SPL transfer (platform fee), and a close-account (rent refund). It never gets approval over tokens you don't sweep, and the wallet stays on your device. The frontend is open to inspection.",
              },
              {
                q: "What's a token account?",
                a: "On Solana, your wallet doesn't hold tokens directly. Each token mint gets its own per-wallet account that costs ~0.002 SOL of rent to exist. Closing emptied accounts refunds that rent.",
              },
              {
                q: "What does it cost?",
                a: "A platform fee of 5% to USDC, 4% to SOL, plus the ~$0.01 network fee Solana charges for the transaction. You keep the SOL rent refund as a bonus.",
              },
              {
                q: "What if a token has no buyer?",
                a: "If Jupiter can't find a route for a token, Duster skips it and keeps cleaning the rest. The skipped tokens stay in your wallet untouched.",
              },
              {
                q: "Why mobile-first?",
                a: "Most Solana wallets are mobile-native. Sweeping dust is a small, opportunistic task you do once in a while — not something you set up a laptop for.",
              },
              {
                q: "What's the DUST token?",
                a: "DUST is Duster's loyalty token. Coming soon — when it launches, holders pay the lowest swap fee (3% vs 5% USDC) and qualify for monthly volume-based rewards.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="rounded-md p-4 group"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <summary className="font-display font-semibold text-[14px] cursor-pointer flex items-center justify-between list-none">
                  {f.q}
                  <span className="text-text-muted text-[18px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[13px] text-text-secondary leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ---- 6. FINAL CTA + FOOTER ---- */}
        <section className="mt-16 sm:mt-24 text-center">
          <h3 className="font-display text-[26px] sm:text-[30px] font-bold leading-tight">
            Ready to find yours?
          </h3>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center justify-center gap-2 h-[56px] px-7 rounded-full bg-sweep text-void font-display font-bold text-[16px] shadow-cta"
          >
            Open Duster
            <span aria-hidden>→</span>
          </Link>
        </section>

        <footer className="mt-16 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted font-mono uppercase tracking-wider">
          <span>duster.guru</span>
          <a
            href="https://github.com/zozzozm/sweeper"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-primary"
          >
            GitHub ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
