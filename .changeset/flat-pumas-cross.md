---
"mobx-react-lite": patch
---

-   Fixed `observer` in `StrictMode` #3671

---

## "mobx-react": major

-   Class component's `props`/`state`/`context` are no longer observable. Attempt to use these in any derivation other than component's `render` throws and error.
-   Extending or applying `observer` classes is now explicitly forbidden
