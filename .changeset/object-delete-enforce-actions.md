---
"mobx": patch
---

Warn under `enforceActions` when an observable object property that a reaction reads is deleted outside an action, as assigning to it and deleting an observed `ObservableMap` key already do.
