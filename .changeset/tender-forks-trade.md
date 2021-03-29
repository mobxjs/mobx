---
"mobx": minor
---

In mobx5 all own properties were by default observable regardless of their value. Since mobx6 we treat functional properties as `action`s or to be precise `autoAction`s. `autoAction` provides `action`'s benefits to your functions, without the need to explicitely annotate them as `actions`.
We think this is useful, but as a consequence, such properties are no longer `observable` and therefore non-writable and also non-enumerable. This turned out to be suprising and inconvinient to some users:
https://github.com/mobxjs/mobx/discussions/2760
https://github.com/mobxjs/mobx/discussions/2586
https://github.com/mobxjs/mobx/issues/2835
https://github.com/mobxjs/mobx/issues/2629
https://github.com/mobxjs/mobx/issues/2551
https://github.com/mobxjs/mobx/issues/2637
So we decided to change it: All *own* props *including functions* are `observable` (enumerable, writable) as in v5, but additionally all functions that become part of deeply observable structure are by default converted to `autoAction`/`flow`.
Note that `deep` option affects this conversion in the same way as it affects conversion of other values (object/array/map/set).

-   by default all functions are converted to `autoAction`s/`flow`s
-   by default all originally _own_ props are now observable and enumerable (as in pre v6)
-   `deep: false` ignores _all_ property values (including functions that would be previously converted to `autoAction`/`flow`)
-   by default _lone_ setters are converted to `action`s
