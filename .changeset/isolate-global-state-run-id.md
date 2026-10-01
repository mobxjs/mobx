---
"mobx": patch
---

fix: `configure({ isolateGlobalState: true })` no longer breaks dependency tracking for observables that were read before it was called. Isolation created a fresh global state with `runId` back at 0, so a new derivation could reuse a `runId` already stored on an observable as `lastAccessedBy_`, and `reportObserved` then skipped registering the dependency. `runId` and `mobxGuid` now start from a value that cannot collide with the counters used before isolation.
