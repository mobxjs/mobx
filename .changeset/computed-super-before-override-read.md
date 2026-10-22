---
"mobx": patch
---

Fix `super` reads of a 2022.3 `@computed` getter returning the subclass override instead of the parent value when that override had not been read yet on the instance.
