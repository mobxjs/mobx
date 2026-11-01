---
"eslint-plugin-mobx": patch
---

`exhaustive-make-observable` recognizes the MobX 7 decorators `@observableRef`, `@observableShallow`, `@observableDeep`, `@observableStruct`, `@computedStruct`, `@actionBound` and `@flowBound`. Before, a class decorated only with them was reported as missing annotations.
