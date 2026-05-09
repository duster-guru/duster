import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const SPL_PROG = TOKEN_PROGRAM_ID.toBase58();
const T22_PROG = TOKEN_2022_PROGRAM_ID.toBase58();

// Two real groups based on token program — this is the only grouping that
// reflects on-chain truth and affects how we batch transactions.
// Each group → one v0 VersionedTransaction in the sweep.
export const GROUPS = {
  spl: {
    id: "spl",
    name: "SPL Token",
    short: "SPL",
    color: "#5B8CFF",
    glyph: "◇",
  },
  token2022: {
    id: "token2022",
    name: "Token-2022",
    short: "T22",
    color: "#14F195",
    glyph: "◬",
  },
};

export const ALL_GROUP_IDS = Object.keys(GROUPS);

export function classifyGroup(programId) {
  if (programId === T22_PROG) return "token2022";
  if (programId === SPL_PROG) return "spl";
  return "spl"; // unknown program — treat as classic
}

/**
 * Build group summaries from priced dust tokens.
 * Input: array of { mint, programId, valueUsd, ata, ... }.
 */
export function summarizeGroups(dust, ids = null) {
  const want = ids?.length ? ids : ALL_GROUP_IDS;
  return want
    .map((id) => {
      const tokens = dust.filter((d) => classifyGroup(d.programId) === id);
      if (!tokens.length) return null;
      const total = +tokens.reduce((s, t) => s + (t.valueUsd || 0), 0).toFixed(2);
      return {
        ...GROUPS[id],
        tokens,
        total,
      };
    })
    .filter(Boolean);
}

export function totalsFor(dust, ids) {
  const want = ids?.length ? ids : ALL_GROUP_IDS;
  const inGroup = (d) => want.includes(classifyGroup(d.programId));
  const tokens = dust.filter(inGroup);
  const total = +tokens.reduce((s, t) => s + (t.valueUsd || 0), 0).toFixed(2);
  return {
    tokens,
    tokenCount: tokens.length,
    groupCount: new Set(tokens.map((t) => classifyGroup(t.programId))).size,
    txCount: new Set(tokens.map((t) => classifyGroup(t.programId))).size,
    total,
  };
}
