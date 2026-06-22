---
"mobx": patch
---

Fix `ObservableValue`/`ComputedValue` `[Symbol.toPrimitive]` returning `null` when the value is `null`. Native engines accept this, but ES5-transpiled consumer code routes coercion through Babel's inlined `_toPrimitive` helper, which treats `null` as an object (`typeof null === "object"`) and throws `TypeError: @@toPrimitive must return a primitive value.`. The method is now hint-aware and mirrors native coercion of `null` (`String(null) === "null"`, `Number(null) === 0`), so coercing a null-holding observable no longer throws on ES5 targets.
