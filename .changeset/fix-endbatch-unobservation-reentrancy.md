---
"mobx": patch
---

Fix a stack overflow ("Maximum call stack size exceeded") that could occur when an `onBecomeUnobserved` handler disposes a `Reaction`. Disposing a `Reaction` re-enters `endBatch()`, which used to recurse into the same `pendingUnobservations` drain loop instead of letting the already-running outer loop pick up the newly queued items, causing unbounded stack depth for long enough chains.
