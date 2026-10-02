---
"mobx": patch
---

Remove the `signal` abort listener when a reaction disposes itself (`r.dispose()` or a resolved `when`), so long-lived `AbortSignal`s no longer accumulate listeners that keep disposed reactions in memory
