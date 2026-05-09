/**
 * Send signed v0 transactions to the cluster and confirm them.
 * On Solana, signAllTransactions returns the signed array — we then
 * sendRawTransaction in parallel and poll getSignatureStatuses until each
 * lands at "confirmed" commitment (or times out).
 */
export async function sendAndConfirmAll({
  connection,
  signedTxs,
  onProgress = null,
  timeoutMs = 60_000,
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

  // Poll status until every signature lands or we time out.
  const start = Date.now();
  const confirmed = new Set();
  const failed = new Map();

  while (confirmed.size + failed.size < signatures.length && Date.now() - start < timeoutMs) {
    const statuses = await connection.getSignatureStatuses(signatures, {
      searchTransactionHistory: false,
    });
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
