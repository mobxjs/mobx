---
"mobx": patch
---

fix: `onBecomeObserved` was not triggered correctly for computed dependencies of computeds. Fixes #2686, #2667
