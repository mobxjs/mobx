---
"mobx": major
"mobx-react": major
---

Release MobX 7 and mobx-react 10.

Bundle sizes are down: ESM prod 17.02 KiB gzip -> 14.90 KiB gzip; a minimal tree-shaken example is 12.63 KiB gzip now.

They remove long-deprecated compatibility paths and make `mobx-react` the single React binding package for MobX 7.

## MobX 7

MobX 7 is a cleanup release focused on the modern runtime and decorator model.

-   MobX now always uses Proxy-backed observable objects and arrays. The ES5/non-proxy fallback has been removed.
-   `configure({ useProxies: ... })` is no longer supported.
-   `{ proxy: false }` options for `observable`, `observable.object`, and `observable.array` are no longer supported.
-   Legacy decorators are no longer supported.
-   The public `trace` API and its related runtime support have been removed. Use `getDependencyTree`, `getObserverTree`, `spy`, MobX developer tools, or logging packages for reactivity debugging.

## mobx-react 10

mobx-react 10 requires MobX 7 and React 18 or later.

`mobx-react` and `mobx-react-lite` have been merged back into one package. `mobx-react-lite` is no longer available; import React bindings from `mobx-react` instead.

This is possible because, after removing `Provider` / `inject` and the old observable `props` / `state` behavior, `mobx-react` had become a thin class-component wrapper around `mobx-react-lite`'s `observer`.

-   Move `observer`, `Observer`, `useLocalObservable`, `enableStaticRendering`, and `isUsingStaticRendering` imports from `mobx-react-lite` to `mobx-react`.
-   The merged `observer` supports function components, `forwardRef`, class components, and Stage 3 `@observer` class decorator usage.
-   Remove React batching imports, including the stale React Native batching deep import. React 18+ renderers handle batching.

The recommended public React binding surface is now:

-   `observer`
-   `Observer`
-   `useLocalObservable`
-   `enableStaticRendering`
-   `isUsingStaticRendering`

The following APIs have been removed from `mobx-react`:

-   `Provider`, `inject`, and `MobXProviderContext`; use `React.createContext` directly.
-   `disposeOnUnmount`; dispose reactions in `componentWillUnmount` or return cleanup functions from `useEffect`.
-   `PropTypes`; use TypeScript or the regular `prop-types` package.
-   `useObserver`; wrap components with `observer` or use `<Observer>`.
-   `useLocalStore`; use `useLocalObservable`.
-   `useAsObservableSource`; synchronize values from props into local observable state explicitly.
-   `useStaticRendering`; use `enableStaticRendering`.
-   `observerBatching`, `isObserverBatched`, `batchingForReactDom`, `batchingOptOut`, and `batchingForReactNative`; remove these imports because React 18+ renderers handle batching.
-   Deprecated `observer(fn, { forwardRef: true })`; pass an already-created `React.forwardRef(...)` component to `observer` instead.
-   Legacy function-component `contextTypes` handling.
