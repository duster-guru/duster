import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";
import { COMMITMENT, RPC_ENDPOINT } from "../lib/config";

/**
 * Top-level Solana context: connection (RPC) + wallet adapter + connect modal.
 *
 * Wallet Standard auto-discovers desktop browser extensions, but iOS Safari
 * and iOS Chrome can't see installed wallet apps the same way (no extension
 * injection). Explicitly registering Phantom and Solflare adapters gives us
 * their mobile deep-link / universal-link path, which is the only thing
 * that works on iOS short of opening the dapp inside the wallet's in-app
 * browser.
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
