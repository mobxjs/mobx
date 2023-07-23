---
"mobx": patch
---

-   fix: #3728: Observable initialization updates state version.
-   fix: Observable set initialization violates `enforceActions: "always"`.
-   fix: Changing keys of observable object does not respect `enforceActions`.
