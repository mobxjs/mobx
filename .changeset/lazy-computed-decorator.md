---
"mobx": patch
---

Make the 2022.3 `@computed` decorator lazy. `ComputedValue` is now created on first read of the decorated getter rather than eagerly during instance construction, avoiding wasted allocations for getters that are never used. Closes #4616.
