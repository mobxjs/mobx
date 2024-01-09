---
"mobx": patch
---

Prevent `reaction` from heeping a Reference to the OldValue that would prevent GC.
