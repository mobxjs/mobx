---
"mobx": patch
---

Add `requiresObservable` to `IWhenOptions`. `when` already forwarded this option to its underlying reaction at runtime, but TypeScript rejected it.
