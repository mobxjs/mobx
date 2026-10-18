---
"mobx": patch
---

Fix `makeAutoObservable(this, overrides)`, `observable(object, annotations)` and `extendObservable` throwing "Invalid annotation" when the object has a member that also exists on `Object.prototype`, such as a `toString()` method. Only own keys of the overrides or annotations object are used as annotations now, as `makeObservable` already does.
