---
"mobx-react-lite": patch
---

fix #3671: `observer` + `StrictMode`
BC: Class component's `props`/`state`/`context` are no longer observable. Attempt to use these in any derivation other than component's `render` throws and error.
BC: Attempt to apply `observer` on a component that is already an `observer` throws instead of warning.
docs: link for mobx-react docs
docs: extending `observer` class components is not supported
