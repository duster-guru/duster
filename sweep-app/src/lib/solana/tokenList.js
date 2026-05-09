import { JUP_TOKENS_SEARCH_URL } from "../config";

/**
 * Fetch token metadata (symbol, name, icon, decimals, tags) for a batch of mints.
 * Returns Map<mintAddress, info>.
 *
 * Uses /tokens/v2/search?query=mint1,mint2,... — supports comma-separated
 * mint addresses. Chunked at 50/req to keep URL length safe.
 *
 * No global "strict list" cache — that endpoint (token.jup.ag/strict) was
 * retired. Per-mint search is fast enough since dust scans only need
 * metadata for the small subset that survives the dust filter.
 */
export async function fetchTokenInfos(mints) {
  if (!mints?.length) return new Map();
  const out = new Map();
  const unique = Array.from(new Set(mints));

  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const url = `${JUP_TOKENS_SEARCH_URL}?query=${chunk.join(",")}`;
    let r;
    try {
      r = await fetch(url);
    } catch (e) {
      console.warn("[tokens] fetch failed for chunk", i, e?.message);
      continue;
    }
    if (!r.ok) {
      console.warn("[tokens] HTTP", r.status, "on chunk", i);
      continue;
    }

    let arr;
    try { arr = await r.json(); } catch { continue; }
    if (!Array.isArray(arr)) continue;

    for (const t of arr) {
      if (t?.id) out.set(t.id, t);
    }
  }

  return out;
}

/**
 * Get a usable info object for a mint, falling back to a synthetic record
 * (so we never block sweeps on missing metadata).
 */
export function tokenInfo(map, mint, decimalsFallback = 0) {
  if (map?.get?.(mint)) {
    const t = map.get(mint);
    // Normalize the v2/search shape: { id, symbol, name, icon, decimals, tags, usdPrice, ... }
    return {
      address: t.id,
      symbol: t.symbol || shortMint(mint),
      name: t.name || "Unknown",
      decimals: t.decimals ?? decimalsFallback,
      logoURI: t.icon || null,
      tags: t.tags || [],
      usdPrice: typeof t.usdPrice === "number" ? t.usdPrice : null,
      isUnverified: !(t.tags || []).some((x) =>
        ["verified", "lst", "strict", "community"].includes(x)
      ),
    };
  }
  return {
    address: mint,
    symbol: shortMint(mint),
    name: "Unknown token",
    decimals: decimalsFallback,
    logoURI: null,
    tags: [],
    usdPrice: null,
    isUnverified: true,
  };
}

function shortMint(mint) {
  if (!mint) return "???";
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
