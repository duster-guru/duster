// Solana-native dust model.
// Each "group" maps to one v0 VersionedTransaction the user signs in a single batch.
// Groups are how we keep within the 1232-byte tx budget while batching swaps + closes.

export const GROUPS = {
  memecoin: {
    id: "memecoin",
    name: "Memecoins",
    short: "MEME",
    color: "#FF8E5C",
    glyph: "◉",
    desc: "BONK, WIF, POPCAT, MEW",
  },
  defi: {
    id: "defi",
    name: "DeFi",
    short: "DEFI",
    color: "#5B8CFF",
    glyph: "◇",
    desc: "JUP, RAY, ORCA",
  },
  lst: {
    id: "lst",
    name: "Liquid Staking",
    short: "LST",
    color: "#9945FF",
    glyph: "◆",
    desc: "mSOL, jitoSOL",
  },
  token2022: {
    id: "token2022",
    name: "Token-2022",
    short: "T22",
    color: "#14F195",
    glyph: "◬",
    desc: "PYUSD, EURC, JLP-22",
  },
};

export const ALL_GROUP_IDS = Object.keys(GROUPS);

// Mock dust list — 12 tokens, $47.32 across 4 groups.
// Real product would `getTokenAccountsByOwner` on TOKEN_PROGRAM_ID + TOKEN_2022_PROGRAM_ID.
export const DUST_TOKENS = [
  // Memecoins — $18.50
  { symbol: "BONK",   group: "memecoin",  value: 8.00, color: "#FF6B00" },
  { symbol: "WIF",    group: "memecoin",  value: 5.00, color: "#DEB887" },
  { symbol: "POPCAT", group: "memecoin",  value: 3.50, color: "#A0A0A0" },
  { symbol: "MEW",    group: "memecoin",  value: 2.00, color: "#FF4FD8" },
  // DeFi — $14.20
  { symbol: "JUP",    group: "defi",      value: 9.00, color: "#34E1A2" },
  { symbol: "RAY",    group: "defi",      value: 3.20, color: "#5B8CFF" },
  { symbol: "ORCA",   group: "defi",      value: 2.00, color: "#FFD27A" },
  // Liquid Staking — $9.50
  { symbol: "mSOL",   group: "lst",       value: 6.30, color: "#9945FF" },
  { symbol: "jitoSOL",group: "lst",       value: 3.20, color: "#FF6B7A" },
  // Token-2022 — $5.62
  { symbol: "PYUSD",  group: "token2022", value: 2.00, color: "#5B8CFF" },
  { symbol: "EURC",   group: "token2022", value: 1.92, color: "#1E3A8A" },
  { symbol: "JLP-22", group: "token2022", value: 1.70, color: "#14F195" },
];

// Solana economics. Per-account rent (closed at sweep time, refunded as native SOL).
// 0.00203928 SOL × $150 ≈ $0.306 per account.
export const SOL_USD = 150;
export const RENT_PER_ACCOUNT_SOL = 0.00203928;
export const RENT_PER_ACCOUNT_USD = +(RENT_PER_ACCOUNT_SOL * SOL_USD).toFixed(4);

// Per-group network fee (base + priority, one v0 tx per group).
// Solana fees are tiny — well under a cent typically. We surface them honestly.
export const GROUP_NETWORK_FEE_USD = {
  memecoin:   0.012,
  defi:       0.010,
  lst:        0.008,
  token2022:  0.011,
};

export const TOTAL_FOUND = +DUST_TOKENS.reduce((s, t) => s + t.value, 0).toFixed(2);
export const TOTAL_NETWORK_FEE = +Object.values(GROUP_NETWORK_FEE_USD).reduce((s, g) => s + g, 0).toFixed(3);
export const TOTAL_RENT_RECLAIM = +(DUST_TOKENS.length * RENT_PER_ACCOUNT_USD).toFixed(2);
export const NET_RECEIVED = +(TOTAL_FOUND - TOTAL_NETWORK_FEE + TOTAL_RENT_RECLAIM).toFixed(2);

// Selectors -----------------------------------------------------------------

export function getGroupSummary(groupIds = ALL_GROUP_IDS) {
  return groupIds.map((id) => {
    const tokens = DUST_TOKENS.filter((t) => t.group === id);
    const total = +tokens.reduce((s, t) => s + t.value, 0).toFixed(2);
    const fee = GROUP_NETWORK_FEE_USD[id] || 0;
    const rent = +(tokens.length * RENT_PER_ACCOUNT_USD).toFixed(2);
    return {
      ...GROUPS[id],
      tokens,
      total,
      fee,
      rent,
      net: +(total - fee + rent).toFixed(2),
    };
  });
}

export function getTotalsFor(groupIds) {
  const ids = groupIds?.length ? groupIds : ALL_GROUP_IDS;
  const tokens = DUST_TOKENS.filter((t) => ids.includes(t.group));
  const total = +tokens.reduce((s, t) => s + t.value, 0).toFixed(2);
  const fee = +ids.reduce((s, id) => s + (GROUP_NETWORK_FEE_USD[id] || 0), 0).toFixed(3);
  const rent = +(tokens.length * RENT_PER_ACCOUNT_USD).toFixed(2);
  return {
    tokens,
    tokenCount: tokens.length,
    groupCount: ids.length,
    txCount: ids.length, // 1 v0 tx per group, signed in one batch
    total,
    fee,
    rent,
    net: +(total - fee + rent).toFixed(2),
  };
}

// Solana wallet address (base58, ~44 chars).
export const WALLET_ADDR = "7Y3kHZGpoTGfBMnCtJxZsVw3PgkLPnA5Y6zX9KqhgLYn";
export const WALLET_SHORT = "7Y3k…gLYn";

export const WALLETS = [
  { id: "phantom",  name: "Phantom",          emoji: "👻" },
  { id: "solflare", name: "Solflare",         emoji: "🔥" },
  { id: "backpack", name: "Backpack",         emoji: "🎒" },
  { id: "sms",      name: "Solana Mobile",    emoji: "📱" },
];

export const USER_STATS = {
  totalCleaned: 312.84,
  rentReclaimed: 28.42, // accumulated across 7 sweeps
  sweeps: 7,
  tokens: 38,
  signatures: 11, // total signatures across all sweeps (~1.5 tx per sweep)
  streak: 5,
  rank: 1284,
  topPercent: 4,
  referrals: 3,
  earned: 3.0,
};
