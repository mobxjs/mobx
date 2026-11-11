---
"mobx": patch
---

Fix private `@observable accessor` fields and private `@computed` getters sharing state when a class and its subclass both declare one with the same name, such as `#value`. They are separate members, but MobX kept both under the name `"#value"`, so the parent's field read and wrote the subclass's value. Private members are now kept under a key of their own. As a result `isObservableProp(obj, "#value")`, `getAtom(obj, "#value")` and `observe(obj, "#value", ...)` no longer find a private member by its name, and change events of a private field carry a symbol as `name`.
