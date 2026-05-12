/**
 * Cloudflare Web Analytics — opt-in via VITE_CF_ANALYTICS_TOKEN in
 * .env.local. Cookieless, no PII, no cookie banner needed, ~5KB beacon
 * loaded async with `defer` so it can't block paint.
 *
 * When the env var isn't set we don't inject the script at all → zero
 * network requests, zero CSP surprises, repo stays clean for forks who
 * don't want analytics.
 *
 * Why CF Web Analytics and not GA: crypto users block GA aggressively
 * via uBlock/Brave/AdGuard (often 30–70% of the audience is invisible
 * to GA). CF's beacon is far less commonly blocked, doesn't ship a
 * cookie banner, and lines up with the "non-custodial / your keys"
 * positioning on the homepage.
 */
export function initCloudflareAnalytics() {
  if (typeof document === "undefined") return;
  const token = import.meta.env.VITE_CF_ANALYTICS_TOKEN?.trim();
  if (!token) return;
  // Idempotent — refuses to add a second beacon if HMR / StrictMode
  // re-runs the entry.
  if (document.querySelector('script[data-cf-beacon]')) return;
  const beacon = document.createElement("script");
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  document.head.appendChild(beacon);
}
