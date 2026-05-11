/**
 * Per-wallet sweep history, persisted in localStorage.
 *
 * In web3 the wallet IS the user identity, so there's no separate login
 * step — the connected pubkey is the key under which we store records.
 * Reconnecting the same wallet (on this device) brings back the history.
 *
 * Cross-device sync isn't here — for that we'd need the backend (see the
 * `sweep-api` directory, currently stashed). The localStorage approach
 * covers the 90% case and is reversibly upgradable: when we ship the
 * backend, we POST the local rows on first reconnect and merge.
 *
 * Record shape (whatever Success.jsx writes — see addRecord callers):
 *   {
 *     ts:              number,           // unix ms
 *     outputAsset:     "usdc"|"sol"|"sweep",
 *     outputAmount:    number,           // tokens received (in output units)
 *     outputUsd:       number,           // USD value of the swap output
 *     rentSol:         number,           // SOL reclaimed from closing ATAs
 *     rentUsd:         number,
 *     totalUnlockedUsd:number,           // swap + rent, the headline number
 *     tokenCount:      number,           // dust tokens actually swept
 *     skippedCount:    number,           // dust tokens Jupiter refused
 *     txSigs:          string[],         // signatures of the batch
 *     dust: [{ symbol: string, valueUsd: number, logoURI?: string|null }],
 *   }
 */

const KEY_PREFIX = "sweep:history:v1:";
const MAX_RECORDS = 100;

function keyFor(pubkey) {
  return KEY_PREFIX + pubkey;
}

export function loadHistory(pubkey) {
  if (!pubkey) return [];
  try {
    const raw = localStorage.getItem(keyFor(pubkey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add a sweep record to history. Idempotent on the primary tx signature
 * so React's StrictMode / remount doesn't produce duplicate entries.
 * Returns the new history array (caller can use it without re-reading).
 */
export function addRecord(pubkey, record) {
  if (!pubkey || !record) return loadHistory(pubkey);
  const existing = loadHistory(pubkey);
  const primarySig = record.txSigs?.[0];
  if (primarySig && existing.some((r) => r.txSigs?.[0] === primarySig)) {
    return existing;
  }
  const next = [{ ts: Date.now(), ...record }, ...existing].slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(keyFor(pubkey), JSON.stringify(next));
  } catch {
    /* quota — silently swallow */
  }
  return next;
}

export function clearHistory(pubkey) {
  if (!pubkey) return;
  try {
    localStorage.removeItem(keyFor(pubkey));
  } catch {
    /* ignore */
  }
}

/**
 * Aggregate counters derived from a record list. Cheap; called on every
 * Dashboard render and re-derived rather than separately persisted so
 * the two can never drift.
 */
export function summarize(records) {
  return records.reduce(
    (acc, r) => ({
      totalCleaned: acc.totalCleaned + (r.totalUnlockedUsd || 0),
      sweeps: acc.sweeps + 1,
      signatures: acc.signatures + (r.txSigs?.length || 0),
      tokens: acc.tokens + (r.tokenCount || 0),
    }),
    { totalCleaned: 0, sweeps: 0, signatures: 0, tokens: 0 },
  );
}
