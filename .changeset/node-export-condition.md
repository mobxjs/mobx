---
"mobx": patch
"mobx-react": patch
"mobx-react-lite": patch
---

perf: add a `node` export condition that routes Node and Bun to the existing `dist/index.js` entry, which picks the prebaked development or production CJS build once at require time. `import`ing mobx in Node no longer executes the env-agnostic `dist/mobx.mjs` with per-call `NODE_ENV` checks, and mixing `import` and `require` in one Node app now yields a single mobx instance.
