import { JUP_PRICE_URL } from "../config";

/**
 * Fetch USD prices for a set of mints via Jupiter Price API v2.
 * Returns Map<mint, number> (USD per 1 unit of token, decimals already accounted for).
 *
 * Chunks the request into 100-mint groups to stay under URL length / API limits.
 * Missing mints are simply absent from the returned map (caller treats as unpriceable
 * and routes them to "no liquidity / skipped").
 */
export async function fetchPrices(mints) {
  if (!mints || mints.length === 0) return new Map();
  const out = new Map();

  const unique = Array.from(new Set(mints));
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const url = `${JUP_PRICE_URL}?ids=${chunk.join(",")}`;
    let r;
    try {
      r = await fetch(url);
    } catch {
      continue; // network blip on one chunk shouldn't kill the scan
    }
    if (!r.ok) continue;

    let json;
    try { json = await r.json(); } catch { continue; }

    const data = json?.data || {};
    for (const [mint, v] of Object.entries(data)) {
      const px = Number(v?.price);
      if (Number.isFinite(px) && px > 0) out.set(mint, px);
    }
  }

  return out;
}
