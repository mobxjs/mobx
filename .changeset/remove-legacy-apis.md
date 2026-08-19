---
"mobx": major
"mobx-react-lite": patch
---

Removed a number of legacy APIs and their supporting internals.

Removed from `mobx`:

-   The top-level object API: `get`, `set`, `has`, `remove`, `keys`, `values`, `entries`, `ownKeys`. Use the native/instance equivalents instead (e.g. `map.get()`, `[...map.keys()]`, `Object.keys(obj)`, `"key" in obj`, `delete obj.key`).
-   The interception/observation APIs: `intercept`, `observe`, `_interceptReads`, and the `spy` API. Use `autorun`/`reaction` to react to changes.
-   The introspection APIs: `getDebugName`, `getDependencyTree`, `getObserverTree`.
-   The `dehancer` mechanism (used internally by the removed `_interceptReads`; it also backed some mobx-state-tree integrations, which are no longer supported).

All associated change-event interfaces (`I*WillChange` / `I*DidChange`), the `IInterceptable`/`IInterceptor`/`IListenable` interfaces, and the related internal machinery have been removed as well. The MobX devtools global hook (which depended on `spy`) has been removed. `MOBX_GLOBALS_VERSION` was bumped accordingly.

`mobx-react-lite` no longer wires the removed `getDependencyTree` into `React.useDebugValue`.
