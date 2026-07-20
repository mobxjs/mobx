---
"mobx": patch
---

perf: fast-path primitives in `deepEnhancer`. Writing a primitive into a deep observable no longer runs the observable/array/plain-object/Map/Set/function type checks; primitives can never be made observable, so they are returned immediately. Creating an observable array of primitives is ~4x faster, and observable Set/Map writes are ~20-25% faster in the perf suite.
