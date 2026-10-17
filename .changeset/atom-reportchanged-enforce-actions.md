---
"mobx": patch
---

`Atom.reportChanged()` now honors `enforceActions`. Changing a custom atom outside an action warns in strict mode, while built-in observables still report a single diagnostic per operation.
