---
"mobx": patch
---

Fix `onBecomeObserved` not firing for dependencies gained when an observed computed is recomputed inside an action.
