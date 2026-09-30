---
"mobx": patch
---

fix: `observable.box(array)` no longer warns under `observableRequiresReaction` when a spy is active. The `create` spy event now reports `newValue` as the value itself rather than a string, matching the declared `IBoxDidChange` type. Previously the constructor stringified the value, and stringifying an observable array reads its `length`, which counted as an observable read outside a reactive context. Spy listeners that relied on `newValue` being a string for `create` events will now receive the raw value.
