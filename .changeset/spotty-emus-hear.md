---
"mobx": patch
---

-   fix: #3728: Observable initialization updates state version.
-   fix: Observable set initialization violates `enforceActions: "always"`.
-   fix: Changing keys of observable object does not respect `enforceActions`.
-   fix: #3734: `isolateGlobalState: true` makes observer stop to react to store changes
