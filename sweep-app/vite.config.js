import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force `buffer` to resolve to the npm polyfill package, not Vite's
      // externalized Node-builtin stub. @solana/spl-token-metadata reads
      // Buffer at module init.
      buffer: 'buffer/',
    },
  },
  define: {
    // Some Solana SDK transitive deps look up `global` (Node) — alias to
    // browser equivalent so module-init code that references it doesn't crash.
    global: 'globalThis',
  },
  optimizeDeps: {
    // Pre-bundle Buffer with the rest so dev-mode imports get the polyfill.
    include: ['buffer'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
})
