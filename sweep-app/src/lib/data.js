// 4 chains · 12 tokens · $47.32 — kept clean for storytelling and animation grids.
// Per-chain sweep is the only honest implementation (bridging dust costs more
// than the dust itself), so the data model groups by chain.

export const CHAINS = {
  polygon:  { id: "polygon",  name: "Polygon",  short: "POLY", color: "#8247E5", glyph: "⬢" },
  arbitrum: { id: "arbitrum", name: "Arbitrum", short: "ARB",  color: "#28A0F0", glyph: "◆" },
  optimism: { id: "optimism", name: "Optimism", short: "OP",   color: "#FF0420", glyph: "●" },
  ethereum: { id: "ethereum", name: "Ethereum", short: "ETH",  color: "#627EEA", glyph: "◇" },
};

export const ALL_CHAIN_IDS = Object.keys(CHAINS);

export const DUST_TOKENS = [
  // Polygon — $17.14
  { symbol: "MATIC", chain: "polygon", value: 12.40, color: "#8247E5" },
  { symbol: "STG",   chain: "polygon", value:  2.74, color: "#A0A0A0" },
  { symbol: "SUSHI", chain: "polygon", value:  2.00, color: "#FA52A0" },
  // Arbitrum — $14.38
  { symbol: "ARB",   chain: "arbitrum", value:  9.18, color: "#28A0F0" },
  { symbol: "MAGIC", chain: "arbitrum", value:  3.10, color: "#E5333A" },
  { symbol: "GMX",   chain: "arbitrum", value:  2.10, color: "#04D1A6" },
  // Optimism — $9.82
  { symbol: "OP",    chain: "optimism", value:  5.77, color: "#FF0420" },
  { symbol: "VELO",  chain: "optimism", value:  2.92, color: "#9D2235" },
  { symbol: "SNX",   chain: "optimism", value:  1.13, color: "#5FCDF9" },
  // Ethereum — $5.98
  { symbol: "PEPE",  chain: "ethereum", value:  2.92, color: "#4DAF4F" },
  { symbol: "SHIB",  chain: "ethereum", value:  1.94, color: "#FFA409" },
  { symbol: "LDO",   chain: "ethereum", value:  1.12, color: "#F69988" },
];

// Per-chain gas estimate (sponsored / paymaster covered, displayed to keep math honest).
export const CHAIN_GAS = {
  polygon:  0.05,
  arbitrum: 0.08,
  optimism: 0.07,
  ethereum: 0.22,
};

export const TOTAL_FOUND = +DUST_TOKENS.reduce((s, t) => s + t.value, 0).toFixed(2);
export const TOTAL_GAS = +Object.values(CHAIN_GAS).reduce((s, g) => s + g, 0).toFixed(2);
export const NET_RECEIVED = +(TOTAL_FOUND - TOTAL_GAS).toFixed(2);

// Selectors -----------------------------------------------------------------

export function getChainSummary(chainIds = ALL_CHAIN_IDS) {
  return chainIds.map((id) => {
    const tokens = DUST_TOKENS.filter((t) => t.chain === id);
    const total = +tokens.reduce((s, t) => s + t.value, 0).toFixed(2);
    return {
      ...CHAINS[id],
      tokens,
      total,
      gas: CHAIN_GAS[id],
      net: +(total - CHAIN_GAS[id]).toFixed(2),
    };
  });
}

export function getTotalsFor(chainIds) {
  const ids = chainIds?.length ? chainIds : ALL_CHAIN_IDS;
  const tokens = DUST_TOKENS.filter((t) => ids.includes(t.chain));
  const total = +tokens.reduce((s, t) => s + t.value, 0).toFixed(2);
  const gas = +ids.reduce((s, id) => s + (CHAIN_GAS[id] || 0), 0).toFixed(2);
  return {
    tokens,
    tokenCount: tokens.length,
    chainCount: ids.length,
    total,
    gas,
    net: +(total - gas).toFixed(2),
  };
}

export const WALLET_ADDR = "0x7a3f8c2e1b9d4f5e6a8c9b0d3f2e1a4b5c6d7b21c";
export const WALLET_SHORT = "0x7a3f…b21c";

export const WALLETS = [
  { id: "metamask", name: "MetaMask",        emoji: "🦊" },
  { id: "phantom",  name: "Phantom",         emoji: "👻" },
  { id: "wc",       name: "WalletConnect",   emoji: "🔗" },
  { id: "coinbase", name: "Coinbase Wallet", emoji: "🔵" },
];

export const USER_STATS = {
  totalCleaned: 312.84,
  sweeps: 7,
  tokens: 38,
  streak: 5,
  rank: 1284,
  topPercent: 4,
  referrals: 3,
  earned: 3.0,
};

// Backwards-compat alias used by older imports
export const EST_GAS = TOTAL_GAS;
