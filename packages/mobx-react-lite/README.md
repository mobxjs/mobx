# mobx-react-lite

[![CircleCI](https://circleci.com/gh/mobxjs/mobx-react-lite.svg?style=svg)](https://circleci.com/gh/mobxjs/mobx-react-lite)
[![Coverage Status](https://coveralls.io/repos/github/mobxjs/mobx-react-lite/badge.svg)](https://coveralls.io/github/mobxjs/mobx-react-lite)
[![NPM downloads](https://img.shields.io/npm/dm/mobx-react-lite.svg?style=flat)](https://npmjs.com/package/mobx-react-lite)[![Minzipped size](https://img.shields.io/bundlephobia/minzip/mobx-react-lite.svg)](https://bundlephobia.com/result?p=mobx-react-lite)
[![Discuss on Github](https://img.shields.io/badge/discuss%20on-GitHub-orange)](https://github.com/mobxjs/mobx/discussions)
[![View changelog](https://img.shields.io/badge/changelogs.xyz-Explore%20Changelog-brightgreen)](https://changelogs.xyz/mobx-react-lite)

This package supports React **function components only**. Use [mobx-react](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react) if you also need class component support. It is still possible to use `<Observer>` inside the render of class components.

## Compatibility table (major versions)

| mobx | mobx-react-lite | Browser                                        |
| ---- | --------------- | ---------------------------------------------- |
| 7    | 5               | Modern browsers with native Proxy support      |
| 6    | 3               | Modern browsers (IE 11+ in compatibility mode) |
| 5    | 2               | Modern browsers                                |
| 4    | 2               | IE 11+, RN w/o Proxy support                   |

`mobx-react-lite` version 5 requires React 18 or higher.

## User Guide 👉 https://mobx.js.org/react-integration.html

---

## API reference ⚒

### **`observer<P>(baseComponent: FunctionComponent<P>): FunctionComponent<P>`**

The observer converts a component into a reactive component, which tracks which observables are used automatically and re-renders the component when one of these values changes.
Can only be used for function components. For class component support see the `mobx-react` package.

### **`<Observer>{renderFn}</Observer>`**

Is a React component, which applies observer to an anonymous region in your component. `<Observer>` can be used both inside class and function components.

### **`useLocalObservable<T>(initializer: () => T, annotations?: AnnotationsMap<T>): T`**

Creates an observable object with the given properties, methods and computed values.

Note that computed values cannot directly depend on non-observable values, but only on observable values, so it might be needed to sync properties into the observable using `useEffect`.

`useLocalObservable` is a short-hand for:

`const [state] = useState(() => observable(initializer(), annotations, { autoBind: true }))`

### **`enableStaticRendering(enable: true)`**

Call `enableStaticRendering(true)` when running in an SSR environment, in which `observer` wrapped components should never re-render, but cleanup after the first rendering automatically. Use `isUsingStaticRendering()` to inspect the current setting.

---

## Removed APIs in version 5

`useObserver`, `useLocalStore`, `useAsObservableSource`, `useStaticRendering`, batching imports, `observerBatching`, and `isObserverBatched` have been removed. Use `observer`, `<Observer>`, `useLocalObservable`, and `enableStaticRendering`; React 18 renderers handle batching.

## Testing

Running the full test suite now requires node 14+
But the library itself does not have this limitation

In order to avoid memory leaks due to aborted renders from React
fiber handling or React `StrictMode`, on environments that does not support [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry), this library needs to
run timers to tidy up the remains of the aborted renders.

This can cause issues with test frameworks such as Jest
which require that timers be cleaned up before the tests
can exit.

### **`clearTimers()`**

Call `clearTimers()` in the `afterEach` of your tests to ensure
that `mobx-react-lite` cleans up immediately and allows tests
to exit.
