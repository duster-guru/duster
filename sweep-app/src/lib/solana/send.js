/**
 * Send signed v0 transactions to the cluster and confirm them.
 * On Solana, signAllTransactions returns the signed array — we then
 * sendRawTransaction in parallel and poll getSignatureStatuses until each
 * lands at "confirmed" commitment.
 *
 * If `lastValidBlockHeight` is provided, we abort polling as soon as the
 * cluster passes it (the blockhash baked into these txs is now expired and
 * any unconfirmed ones will never land). This avoids dragging users through
 * the full timeoutMs when the answer is already known.
 */
export async function sendAndConfirmAll({
  connection,
  signedTxs,
  onProgress = null,
  timeoutMs = 90_000,
  lastValidBlockHeight = null,
}) {
  if (!signedTxs.length) return { signatures: [], confirmed: [], failed: [] };

  // Fire all sends in parallel — atomic per tx, ordered only loosely.
  const signatures = await Promise.all(
    signedTxs.map((tx) =>
      connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: "confirmed",
      })
    )
  );

  // Poll status until every signature lands, the blockhash expires, or
  // we hit the absolute timeout.
  const start = Date.now();
  const confirmed = new Set();
  const failed = new Map();

  while (confirmed.size + failed.size < signatures.length && Date.now() - start < timeoutMs) {
    const [statuses, currentHeight] = await Promise.all([
      connection.getSignatureStatuses(signatures, { searchTransactionHistory: false }),
      lastValidBlockHeight ? connection.getBlockHeight("confirmed").catch(() => null) : null,
    ]);
    statuses.value.forEach((s, i) => {
      if (!s) return;
      if (s.err) {
        failed.set(signatures[i], s.err);
      } else if (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized") {
        confirmed.add(signatures[i]);
      }
    });
    onProgress?.({ confirmed: confirmed.size, failed: failed.size, total: signatures.length });
    if (confirmed.size + failed.size >= signatures.length) break;

    // Blockhash expired — anything still unconfirmed is dead. Don't keep waiting.
    if (
      lastValidBlockHeight &&
      typeof currentHeight === "number" &&
      currentHeight > lastValidBlockHeight
    ) {
      signatures.forEach((sig) => {
        if (!confirmed.has(sig) && !failed.has(sig)) {
          failed.set(sig, { reason: "blockhash expired" });
        }
      });
      break;
    }

    await sleep(1000);
  }

  return {
    signatures,
    confirmed: Array.from(confirmed),
    failed: Array.from(failed.entries()).map(([sig, err]) => ({ sig, err })),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
