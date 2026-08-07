---
"mobx": patch
"mobx-react": patch
"mobx-react-lite": patch
---

perf: evaluate `NODE_ENV` once at module scope in the env-agnostic esm bundles (`dist/<pkg>.esm.js` and `dist/<pkg>.mjs`) instead of at every `__DEV__` call site. `process.env` is an exotic object in Node, so each check performed a real environment lookup on hot paths; consumers that execute these files as-is (Node ESM, vitest, SSR) see roughly 10x faster observable writes in dev mode. All env-set artifacts and bundler output are unchanged.
