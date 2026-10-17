---
"mobx": patch
---

`getAtom` checks for observable objects first: it is faster on them and no longer subscribes the running derivation to the internal set/map marker keys.
