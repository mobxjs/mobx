---
"mobx": patch
---

fix: assigning `length` on an observable array now respects `intercept`. A cancelled or modified splice used to be overridden by a direct write to the backing array, which truncated it without notifying observers and made the next mutation throw "Modification exception". A non-integer `length` now throws "Out of range" before touching the array.
