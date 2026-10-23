---
"eslint-plugin-mobx": minor
---

Remove the `missing-make-observable` rule and add `mobx@^7.0.0` as a peer dependency. MobX 7 only supports 2022.3 decorators, which don't need `makeObservable(this)`, and `makeObservable` requires the annotations argument, so the rule no longer applies. MobX 6 users with legacy decorators should stay on `eslint-plugin-mobx` 0.1.x.
