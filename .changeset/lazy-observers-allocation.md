---
"mobx": patch
---

perf: lazily allocate the internal `observers_` Set. Atoms and computed values no longer allocate an empty `Set` upfront; it is created on first observer instead. Most atoms in large stores are never observed, so this saves roughly 160 bytes per unobserved atom (e.g. ~35% lower heap usage when hydrating 50k instances with 10 observable fields each).
