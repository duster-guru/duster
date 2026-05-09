import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import { USDC_MINT } from "../lib/config";
import { sendAndConfirmAll } from "../lib/solana/send";
import { fetchUsdcBalance } from "../lib/solana/tokenAccounts";
import { buildSweepTransactions } from "../lib/solana/txBuilder";

/**
 * Execute the sweep end-to-end:
 *   1. Build v0 VersionedTransactions (Jupiter quote + swap-instructions per token,
 *      packed into 1-3 txs)
 *   2. signAllTransactions  — single wallet prompt
 *   3. sendRawTransaction × N in parallel
 *   4. getSignatureStatuses poll until each lands
 *   5. Re-fetch USDC balance for the post-sweep delta
 *
 * Phase machine for UI:
 *   'idle' → 'building' → 'signing' → 'sending' → 'confirming'
 *          → 'success' | 'error'
 */
export default function useSweepExecution() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();

  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [usdcAfter, setUsdcAfter] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [txCount, setTxCount] = useState(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setError(null);
    setSignatures([]);
    setUsdcAfter(null);
    setSkipped([]);
    setTxCount(0);
  }, []);

  const sweep = useCallback(
    async (dustTokens) => {
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

      try {
        // ---- BUILD ----
        setPhase("building");
        setProgress(10);
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        const { transactions, plan } = await buildSweepTransactions({
          connection,
          user: publicKey,
          dustTokens,
          recentBlockhash: blockhash,
        });

        const skippedTokens = plan
          .filter((p) => p.error)
          .map((p) => ({ token: p.token, error: p.error }));
        setSkipped(skippedTokens);

        if (transactions.length === 0) {
          throw new Error(
            skippedTokens.length
              ? "No routable dust — every token errored on Jupiter."
              : "No transactions built."
          );
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
          onProgress: ({ confirmed, total }) => {
            const conf = total > 0 ? confirmed / total : 0;
            setProgress(55 + Math.floor(conf * 35)); // 55 → 90
            if (conf > 0) setPhase("confirming");
          },
        });
        setSignatures(result.signatures);

        if (result.failed.length && result.confirmed.length === 0) {
          throw new Error(
            `All ${result.failed.length} transactions failed: ${describeErr(result.failed[0].err)}`
          );
        }

        // ---- POST: USDC delta ----
        setPhase("confirming");
        setProgress(95);
        const usdc = await fetchUsdcBalance(connection, publicKey, USDC_MINT);
        setUsdcAfter(usdc);

        setProgress(100);
        setPhase("success");
        return {
          ...result,
          plan,
          usdcAfter: usdc,
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
    usdcAfter,
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
