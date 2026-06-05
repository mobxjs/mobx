---
"mobx": patch
---

Fix regression from #4639 where a `@computed` override of a base-class `makeObservable` computed threw "[MobX] Cycle detected in computation" (#4660)
