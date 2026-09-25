---
"mobx": patch
---

perf: reduce memory used by large, mostly unobserved state. `intercept` / `observe` handler arrays are allocated at their exact size, an observable's internal observers `Set` is released once its last observer leaves, observable objects created with the same `deep` / `autoBind` options share one default annotation instead of allocating their own, and `endBatch()` skips the unobservation pass when nothing is pending.
