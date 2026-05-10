import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import { FEE_AUTHORITY, USDC_MINT } from "../lib/config";
import { sendAndConfirmAll } from "../lib/solana/send";
import { fetchOutputBalance } from "../lib/solana/tokenAccounts";
import { buildSweepTransactions } from "../lib/solana/txBuilder";

/**
 * Execute the sweep end-to-end:
 *   1. Snapshot destination-mint balance pre-sweep
 *   2. Build v0 VersionedTransactions (Jupiter quote + swap-instructions per
 *      token, packed into 1-3 txs)
 *   3. signAllTransactions — single wallet prompt
 *   4. sendRawTransaction × N in parallel
 *   5. getSignatureStatuses poll until each lands
 *   6. Re-fetch destination-mint balance for the post-sweep delta
 *
 * Phase machine for UI:
 *   'idle' → 'building' → 'signing' → 'sending' → 'confirming'
 *          → 'success' | 'error'
 *
 * Destination is parameterised via opts.outputMint — callers pass USDC_MINT
 * for the default flow, or a SWEEP token mint for the +10% bonus mode.
 */
export default function useSweepExecution() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();

  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [destBefore, setDestBefore] = useState(null);
  const [destAfter, setDestAfter] = useState(null);
  const [destMint, setDestMint] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [txCount, setTxCount] = useState(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setError(null);
    setSignatures([]);
    setDestBefore(null);
    setDestAfter(null);
    setDestMint(null);
    setSkipped([]);
    setTxCount(0);
  }, []);

  const sweep = useCallback(
    async (dustTokens, opts = {}) => {
      if (!connected || !publicKey || !signAllTransactions) {
        const e = new Error("Wallet not connected");
        setError(e);
        setPhase("error");
        throw e;
      }
      if (!dustTokens?.length) {
        const e = new Error("No dust to sweep");
        setError(e);
        setPhase("error");
        throw e;
      }

      const outputMint = opts.outputMint || USDC_MINT;
      const feeBps = opts.feeBps ?? 0;
      setDestMint(outputMint.toBase58());

      try {
        // ---- BUILD ----
        setPhase("building");
        setProgress(10);
        const before = await fetchOutputBalance(connection, publicKey, outputMint);
        setDestBefore(before);

        // buildSweepTransactions fetches a fresh blockhash JIT (after the
        // slow Jupiter loop, before packing) and returns it so we can scope
        // confirmation polling to the same expiration window.
        const { transactions, plan, blockhash, lastValidBlockHeight } =
          await buildSweepTransactions({
            connection,
            user: publicKey,
            dustTokens,
            outputMint,
            feeBps,
            feeAuthority: FEE_AUTHORITY,
          });

        const skippedTokens = plan
          .filter((p) => p.error)
          .map((p) => ({ token: p.token, error: p.error }));
        setSkipped(skippedTokens);

        if (transactions.length === 0) {
          if (skippedTokens.length) {
            // Group identical error messages so the user sees a meaningful
            // root cause ("Jupiter quote 429: rate limited") instead of a
            // raw count.
            const reasons = new Map();
            for (const s of skippedTokens) {
              const key = s.error || "unknown";
              reasons.set(key, (reasons.get(key) || 0) + 1);
            }
            const summary = Array.from(reasons.entries())
              .map(([err, n]) => `${n}× ${err}`)
              .join(" · ");
            const e = new Error(`No routable dust — Jupiter rejected every token: ${summary}`);
            e.skipped = skippedTokens;
            throw e;
          }
          throw new Error("No transactions built.");
        }
        setTxCount(transactions.length);
        setProgress(25);

        // ---- SIGN ----
        setPhase("signing");
        setProgress(40);
        const signed = await signAllTransactions(transactions);

        // ---- SEND + CONFIRM ----
        setPhase("sending");
        setProgress(55);
        const result = await sendAndConfirmAll({
          connection,
          signedTxs: signed,
          lastValidBlockHeight,
          onProgress: ({ confirmed, total }) => {
            const conf = total > 0 ? confirmed / total : 0;
            setProgress(55 + Math.floor(conf * 35));
            if (conf > 0) setPhase("confirming");
          },
        });
        setSignatures(result.signatures);

        if (result.failed.length && result.confirmed.length === 0) {
          throw new Error(
            `All ${result.failed.length} transactions failed: ${describeErr(result.failed[0].err)}`
          );
        }

        // ---- POST: balance delta on destination mint ----
        setPhase("confirming");
        setProgress(95);
        const after = await fetchOutputBalance(connection, publicKey, outputMint);
        setDestAfter(after);

        setProgress(100);
        setPhase("success");
        return {
          ...result,
          plan,
          destMint: outputMint.toBase58(),
          destBefore: before,
          destAfter: after,
          lastValidBlockHeight,
        };
      } catch (e) {
        setError(e);
        setPhase("error");
        throw e;
      }
    },
    [connection, publicKey, signAllTransactions, connected]
  );

  return {
    phase,
    progress,
    error,
    signatures,
    skipped,
    txCount,
    destBefore,
    destAfter,
    destMint,
    // Backwards-compat aliases for screens that still reference the USDC names
    usdcBefore: destBefore,
    usdcAfter: destAfter,
    sweep,
    reset,
  };
}

function describeErr(err) {
  if (!err) return "unknown";
  if (typeof err === "string") return err;
  if (err.InstructionError) {
    const [idx, detail] = err.InstructionError;
    return `instruction ${idx}: ${JSON.stringify(detail)}`;
  }
  return JSON.stringify(err);
}
