---
"eslint-plugin-mobx": patch
---

`exhaustive-make-observable` checks undecorated members even when the class has decorated ones, and reports `makeObservable` called without annotations, which throws in MobX 7.
