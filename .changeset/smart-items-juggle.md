---
"mobx": patch
---

Delay derivation of computed values for reactions until they're required. This means that unnescessary derivations will be avoided and that derivations will be properly delayed until they're read.
