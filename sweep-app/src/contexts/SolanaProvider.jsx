import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { COMMITMENT, RPC_ENDPOINT } from "../lib/config";

/**
 * Top-level Solana context: connection (RPC) + wallet adapter + connect modal.
 *
 * Empty `wallets={[]}` is intentional: every modern Solana wallet (Phantom,
 * Solflare, Backpack, Glow, Brave, Coinbase Wallet, …) ships the Wallet
 * Standard, which the WalletProvider auto-detects at runtime. Pulling in the
 * meta-package `@solana/wallet-adapter-wallets` would add 50+ legacy adapters
 * (most requiring react-native or React 17/18 peer deps) for zero benefit.
 */
const wallets = [];

export default function SolanaProvider({ children }) {
  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={{ commitment: COMMITMENT }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
