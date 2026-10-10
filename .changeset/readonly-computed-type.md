---
"mobx": minor
---

`computed(fn)` without a `set` option now returns `IComputedValue<T>` with only `get()`, so calling `.set()` on it is a type error instead of a runtime throw. `computed(fn, { set })` returns the new `IWritableComputedValue<T>`, which also has `set()`.
