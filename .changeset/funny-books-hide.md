---
"mobx": patch
---

The overall memory usage of MobX has been reduced in production builds by skipping the generation of debug identifiers. The internal `mapid_` field of Reaction has been removed as part of the change.
