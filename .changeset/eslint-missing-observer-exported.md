---
"eslint-plugin-mobx": patch
---

`missing-observer` no longer reports components that are wrapped with `observer` elsewhere in the file, e.g. `export default observer(Cmp)`
