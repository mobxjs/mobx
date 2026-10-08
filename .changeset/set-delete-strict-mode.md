---
"mobx": patch
---

Fix `ObservableSet.delete` (and therefore `clear`/`replace`) bypassing the `enforceActions` action diagnostics. Deleting observed values outside an action now warns/throws just like insertion already does, instead of silently allowing the mutation.
