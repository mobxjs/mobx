---
"eslint-plugin-mobx": patch
---

`missing-make-observable` no longer reports classes with decorated `accessor` fields, e.g. `@observable accessor title = ""`. Those use 2022.3 decorators, which don't need `makeObservable(this)`.
