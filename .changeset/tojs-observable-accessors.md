---
"mobx": patch
---

`toJS` now includes fields declared with `@observable accessor`. These fields live on the prototype, so they are neither own nor enumerable properties, and `toJS` returned an object without them (often just `{}`). Computed values are still left out. Spread, `Object.keys` and `JSON.stringify` are unchanged.
