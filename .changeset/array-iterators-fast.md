---
"mobx": patch
---

perf: iterate observable arrays (`for...of`, spread, `Array.from`, `entries()`, `keys()`, `values()`) without going through the proxy for every item
