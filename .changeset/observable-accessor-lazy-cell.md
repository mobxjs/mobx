---
"mobx": minor
---

`@observable accessor` fields now get their `ObservableValue` on the first read inside a derivation, or when `getAtom`, `observe(object, key)`, `intercept(object, key)` or `onBecomeObserved` ask for it, instead of on the first read or write of any kind. Until then the value lives in the accessor's own slot, so a field that nothing observes allocates nothing, however often it is read or written. Constructors that assign their fields no longer create an `ObservableValue` for each of them: on the 50k-instance × 10-field benchmark with every field assigned in the constructor, construction heap drops by about 75% and construction time by more than half. Object-level `observe`, `intercept` and `spy` report writes to such fields as before. Follow-up to #4658.
