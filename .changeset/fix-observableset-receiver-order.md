---
"mobx": patch
---

Fix ObservableSet union, intersection and symmetricDifference to return results in receiver order, matching native Set, when the argument is a plain Set.
