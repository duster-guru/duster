// Must be imported FIRST in main.jsx — before any @solana/* import.
// ES modules resolve depth-first, so the body of this module runs before
// any subsequent import's body. That guarantees Buffer is on globalThis
// before @solana/spl-token-metadata (and friends) read it at module init.

import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  window.Buffer = Buffer;
}
// Some libs sniff `global` (Node compat); alias it to globalThis.
if (typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}
