---
"mobx": major
"mobx-react-lite": major
"mobx-react": major
---

Release MobX 7, mobx-react-lite 5, and mobx-react 10.

Bundle sizes are down: ESM prod 17.02 KiB gzip -> 14.90 KiB gzip; a minimal tree-shaken example is 12.63 KiB gzip now.

It removes long-deprecated compatibility paths and keeps the React bindings split between `mobx-react-lite` for function components and `mobx-react` for class-component support.

## MobX 7

MobX 7 is a cleanup release focused on the modern runtime and decorator model.

-   MobX now always uses Proxy-backed observable objects and arrays. The ES5/non-proxy fallback has been removed.
-   `configure({ useProxies: ... })` is no longer supported.
-   `{ proxy: false }` options for `observable`, `observable.object`, and `observable.array` are no longer supported.
-   Legacy decorators are no longer supported.
-   The public `trace` API and its related runtime support have been removed. Use `toJS`, `getDependencyTree`, `getObserverTree`, `spy` or `mobx-log` package for debugging.

## mobx-react-lite 5 and mobx-react 10

mobx-react-lite 5 and mobx-react 10 require MobX 7 and React 18 or later.

`mobx-react-lite` remains the function-component package. `mobx-react` remains a thin wrapper around `mobx-react-lite` that adds class component and Stage 3 `@observer` class decorator support.

-   Keep function-component imports on `mobx-react-lite` if you do not need class component support.
-   Use `mobx-react` when you need class components or `@observer` class decorators.
-   `mobx-react-lite` supports function components and `forwardRef`; `mobx-react` delegates function components to `mobx-react-lite` and handles classes itself.
-   Remove React batching imports, including the stale React Native batching deep import. React 18+ renderers handle batching.

The recommended public React binding surface for both packages is:

-   `observer`
-   `Observer`
-   `useLocalObservable`
-   `enableStaticRendering`
-   `isUsingStaticRendering`

The following APIs have been removed from the React binding packages:

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
