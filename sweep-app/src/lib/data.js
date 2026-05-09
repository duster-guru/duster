// Mock dust tokens — what a "real" scan might surface for a typical wallet.
// Colors are token brand colors; symbols mapped to emoji-ish icons for prototype.
export const DUST_TOKENS = [
  { symbol: "MATIC", chain: "Polygon",   value: 12.40, color: "#8247E5" },
  { symbol: "ARB",   chain: "Arbitrum",  value:  9.18, color: "#28A0F0" },
  { symbol: "ATOM",  chain: "Cosmos",    value:  6.02, color: "#6F7390" },
  { symbol: "OP",    chain: "Optimism",  value:  5.77, color: "#FF0420" },
  { symbol: "AVAX",  chain: "Avalanche", value:  3.41, color: "#E84142" },
  { symbol: "FTM",   chain: "Fantom",    value:  2.88, color: "#1969FF" },
  { symbol: "GMX",   chain: "Arbitrum",  value:  2.10, color: "#04D1A6" },
  { symbol: "STG",   chain: "Polygon",   value:  1.74, color: "#A0A0A0" },
  { symbol: "LDO",   chain: "Ethereum",  value:  1.12, color: "#F69988" },
  { symbol: "PEPE",  chain: "Ethereum",  value:  0.92, color: "#4DAF4F" },
  { symbol: "DYDX",  chain: "Cosmos",    value:  0.88, color: "#6966FF" },
  { symbol: "SUSHI", chain: "Polygon",   value:  0.80, color: "#FA52A0" },
];

export const TOTAL_FOUND = DUST_TOKENS.reduce((s, t) => s + t.value, 0); // 47.32
export const EST_GAS = 0.42;
export const NET_RECEIVED = +(TOTAL_FOUND - EST_GAS).toFixed(2);

export const WALLET_ADDR = "0x7a3f8c2e1b9d4f5e6a8c9b0d3f2e1a4b5c6d7b21c";
export const WALLET_SHORT = "0x7a3f…b21c";

export const WALLETS = [
  { id: "metamask", name: "MetaMask",        emoji: "🦊" },
  { id: "phantom",  name: "Phantom",         emoji: "👻" },
  { id: "wc",       name: "WalletConnect",   emoji: "🔗" },
  { id: "coinbase", name: "Coinbase Wallet", emoji: "🔵" },
];

// Returning user dashboard mock state
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
