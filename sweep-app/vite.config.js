import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Surface version + git hash + build date in the UI. Read at build time
// so the bundle is statically pinned to one identifier — useful for bug
// reports ("which version are you on?") and post-deploy sanity-checks.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
function safeExec(cmd, fallback = 'unknown') {
  try { return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim() }
  catch { return fallback }
}
const APP_VERSION = pkg.version
const APP_COMMIT  = safeExec('git rev-parse --short HEAD')
const APP_BUILT   = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

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
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT__:  JSON.stringify(APP_COMMIT),
    __APP_BUILT__:   JSON.stringify(APP_BUILT),
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
