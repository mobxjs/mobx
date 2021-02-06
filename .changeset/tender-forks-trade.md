---
"mobx": patch
---

-   by default all functions are converted to `autoAction`s/`flow`s
-   by default all originally _own_ props are now observable and enumerable (as in pre v6)
-   by default _lone_ setters are converted to `action`s
