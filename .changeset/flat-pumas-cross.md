---
"mobx-react-lite": patch
"mobx-react": major
---

-   Fixed `observer` in `StrictMode` #3671
-   **[BREAKING CHANGE]** Class component's `props`/`state`/`context` are no longer observable. Attempt to use these in any derivation other than component's `render` throws and error. For details see https://github.com/mobxjs/mobx/blob/main/packages/mobx-react/README.md#note-on-using-props-and-state-in-derivations
-   Extending or applying `observer` classes is now explicitly forbidden
