import { JUP_TOKEN_LIST_URL } from "../config";

let cache = null;
let inflight = null;

/**
 * Fetch Jupiter's strict (verified) token list. Returns Map<mintAddress, info>.
 * Cached for the life of the page — list is large (~3k entries) but stable.
 *
 * Each info carries: address, symbol, name, decimals, logoURI, tags[].
 * We use it for:
 *   - Symbol + logo display in the dust list
 *   - Decimals (cross-check with on-chain mint info)
 *   - Tag-based grouping when caller wants it
 */
export async function fetchTokenList() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const r = await fetch(JUP_TOKEN_LIST_URL);
    if (!r.ok) throw new Error(`Token list fetch failed: ${r.status}`);
    const arr = await r.json();
    cache = new Map(arr.map((t) => [t.address, t]));
    inflight = null;
    return cache;
  })();
  return inflight;
}

/**
 * Get info for a single mint, falling back to a synthetic record when
 * the token isn't in the strict list. We never block sweeps on missing
 * metadata — symbol/logo are cosmetic.
 */
export function tokenInfo(map, mint, decimalsFallback = 0) {
  if (map?.get?.(mint)) return map.get(mint);
  return {
    address: mint,
    symbol: shortMint(mint),
    name: "Unknown token",
    decimals: decimalsFallback,
    logoURI: null,
    tags: [],
    isUnverified: true,
  };
}

function shortMint(mint) {
  if (!mint) return "???";
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
