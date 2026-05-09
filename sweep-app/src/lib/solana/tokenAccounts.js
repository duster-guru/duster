import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/**
 * Fetch every SPL token account owned by `owner` across both the legacy
 * Token program and Token-2022. Returns parsed records ready for pricing.
 *
 * Filters out:
 *   - zero-balance accounts (still surfaced separately for rent reclaim — caller decides)
 *   - frozen accounts (cannot be transferred / swapped)
 *
 * Each record carries the ATA pubkey because that's what we'll close to
 * reclaim rent after a successful sweep.
 */
export async function fetchTokenAccounts(connection, owner) {
  const ownerPk = owner instanceof PublicKey ? owner : new PublicKey(owner);

  const [classic, t22] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(
      ownerPk,
      { programId: TOKEN_PROGRAM_ID },
      "confirmed"
    ),
    connection.getParsedTokenAccountsByOwner(
      ownerPk,
      { programId: TOKEN_2022_PROGRAM_ID },
      "confirmed"
    ),
  ]);

  const parse = ({ account, pubkey }, programIdStr) => {
    const info = account.data.parsed.info;
    const tokenAmount = info.tokenAmount;
    return {
      ata: pubkey.toBase58(),
      mint: info.mint,
      owner: info.owner,
      amount: BigInt(tokenAmount.amount),
      uiAmount: Number(tokenAmount.uiAmount || 0),
      decimals: tokenAmount.decimals,
      programId: programIdStr,
      state: info.state,
      isFrozen: info.state === "frozen",
      isNative: !!info.isNative,
    };
  };

  const all = [
    ...classic.value.map((v) => parse(v, TOKEN_PROGRAM_ID.toBase58())),
    ...t22.value.map((v) => parse(v, TOKEN_2022_PROGRAM_ID.toBase58())),
  ];

  return all.filter((t) => !t.isFrozen);
}

/** Fetch native SOL balance (lamports) for the owner. */
export async function fetchSolBalance(connection, owner) {
  const ownerPk = owner instanceof PublicKey ? owner : new PublicKey(owner);
  return connection.getBalance(ownerPk, "confirmed");
}

/**
 * Fetch the user's USDC balance specifically. Used to compute realised swap
 * delta for the success screen.
 */
export async function fetchUsdcBalance(connection, owner, usdcMint) {
  const ownerPk = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const accounts = await connection.getParsedTokenAccountsByOwner(
    ownerPk,
    { mint: usdcMint },
    "confirmed"
  );
  if (!accounts.value.length) return 0;
  return Number(accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0);
}
