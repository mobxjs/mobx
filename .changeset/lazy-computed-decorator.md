---
"mobx": minor
---

feat(mobx): make the 2022.3 `@computed` decorator lazy. `ComputedValue` is now created on first read of the decorated getter rather than eagerly during instance construction, avoiding wasted allocations for getters that are never used. On a 50k-instance × 10-getter class with one read per instance this cuts construction heap by ~50% and construction time by ~25%; the steady-state read path is unchanged. Closes #4616.
