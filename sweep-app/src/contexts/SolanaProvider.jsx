import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { COMMITMENT, RPC_ENDPOINT } from "../lib/config";

/**
 * Top-level Solana context: connection (RPC) + wallet adapter + connect modal.
 * Backpack and most modern Solana wallets advertise via the Wallet Standard,
 * so the WalletProvider auto-detects them — we only explicitly register the
 * legacy adapters that don't ship Wallet Standard support.
 */
export default function SolanaProvider({ children }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={{ commitment: COMMITMENT }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
