---
"mobx": patch
---

Warn under `enforceActions` when an `ObservableMap` key that a reaction reads through `get(key)` or `has(key)` is added or deleted outside an action. Before, only updates of existing keys and changes seen through `keys()`, `size` or iteration were checked, so the case from #940 stayed silent.
