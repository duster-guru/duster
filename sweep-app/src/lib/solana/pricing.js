import { JUP_PRICE_URL } from "../config";

/**
 * Fetch USD prices for a set of mints via Jupiter Price API v3.
 * Returns Map<mint, number> (USD per 1 token unit, decimals already accounted).
 *
 * v3 response shape:
 *   { "<mint>": { usdPrice: number, decimals, liquidity, blockId, ... } }
 *
 * Chunks 100 mints per request. Missing mints are simply absent — caller
 * decides whether to skip them or surface as "unpriceable".
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
    } catch (e) {
      console.warn("[pricing] fetch failed for chunk", i, e?.message);
      continue;
    }
    if (!r.ok) {
      console.warn("[pricing] HTTP", r.status, "on chunk", i);
      continue;
    }

    let json;
    try { json = await r.json(); } catch { continue; }

    for (const [mint, v] of Object.entries(json || {})) {
      const px = Number(v?.usdPrice);
      if (Number.isFinite(px) && px > 0) out.set(mint, px);
    }
  }

  return out;
}
