---
"mobx": minor
---

feat(mobx): make the 2022.3 `@observable accessor` decorator lazy. `ObservableValue` is now created on first read/write/observe of the decorated accessor rather than eagerly during instance construction, avoiding wasted allocations for fields that are never touched. On a 50k-instance × 10-field class with sparse access (1 of 10 fields read per instance), this cuts construction heap by ~82% and construction time by ~86% versus the eager path. Follow-up to #4639.
