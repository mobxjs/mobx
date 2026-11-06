---
"mobx-react-plugin": patch
---

Vite plugin: fix "Invalid hook call" and a page reload on the first dev-server start. Vite's dependency scanner does not see the `observer` import the plugin adds to components, so it discovered `mobx-react-lite` late and re-optimized while the page was loading. The plugin now adds `mobx-react-lite` to `optimizeDeps.include`.
