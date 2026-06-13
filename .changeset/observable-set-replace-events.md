---
"mobx": patch
---

Fix `ObservableSet.replace` emitting spurious `delete`/`add` events (and triggering reactions) for values that are unchanged. It now only fires `delete` for removed values and `add` for newly added ones, mirroring `ObservableMap.replace`.
