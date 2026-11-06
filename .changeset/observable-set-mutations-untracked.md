---
"mobx": patch
---

`add`, `delete` and `replace` of an observable set no longer subscribe the running derivation to the set, matching observable maps and arrays.
