---
title: Migrating from MobX 6
sidebar_label: Migrating from MobX 6 {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Migrating from MobX 6 {🚀}

MobX 7 is mostly a cleanup release. Most applications that already use MobX 6 idiomatically can upgrade with dependency, import and decorator configuration changes.

## Getting started

1. Install the latest `mobx` and `mobx-react`.
2. Uninstall `mobx-react-lite`.
3. Make sure your runtime has native [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) support.
4. If you use decorators, make sure they use Stage 3 syntax. Legacy decorators are not supported in MobX 7. Check out the [Enabling decorators {🚀}](enabling-decorators.md) section for more details.
5. Remove `configure({ useProxies: ... })` and `{ proxy: false }` observable options. MobX 7 always uses Proxy-backed observable arrays and plain objects.

## Updating React bindings

The only React bindings package in MobX 7 is `mobx-react`. It supports function components, `forwardRef`, class components, and the `@observer` class decorator.

Install the MobX 7 packages and remove the old React bindings package:

```shell
npm install mobx@latest mobx-react@latest
npm uninstall mobx-react-lite
```

Update imports from `mobx-react-lite` to `mobx-react`:

```diff
-import { observer, Observer, useLocalObservable } from "mobx-react-lite"
+import { observer, Observer, useLocalObservable } from "mobx-react"
```

`mobx-react` requires React 18 or later.

The public `mobx-react` surface has been reduced to the APIs that are still recommended:

-   `observer`
-   `Observer`
-   `useLocalObservable`
-   `enableStaticRendering`
-   `isUsingStaticRendering`

The following APIs have been removed:

| Removed API                                                                                                | Replacement                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `disposeOnUnmount`                                                                                         | Dispose reactions in `componentWillUnmount`, or return a cleanup function from `useEffect`.                                     |
| `PropTypes`                                                                                                | Use TypeScript or the regular `prop-types` package.                                                                             |
| `useLocalStore`                                                                                            | Use `useLocalObservable`.                                                                                                       |
| `useAsObservableSource`                                                                                    | Store the values you need locally and synchronize them from props with `useEffect`.                                             |
| `useObserver`                                                                                              | Wrap the component in `observer`, or use the `<Observer>` component.                                                            |
| `useStaticRendering`                                                                                       | Use `enableStaticRendering`.                                                                                                    |
| `observerBatching`, `isObserverBatched`, `batchingForReactDom`, `batchingOptOut`, `batchingForReactNative` | Remove these imports. React DOM batching is configured internally, and the React Native side-effect import is no longer needed. |
| `Provider`, `inject`, `MobXProviderContext`                                                                | Use `React.createContext` directly.                                                                                             |

## Migrating legacy decorators

MobX 7 supports Stage 3 decorators only.

Legacy decorators looked like this:

```javascript
import { makeObservable, observable, computed, action } from "mobx"

class Todo {
    @observable title = ""
    @observable finished = false

    constructor() {
        makeObservable(this)
    }

    @computed
    get label() {
        return `${this.finished ? "[DONE]" : "[OPEN]"} ${this.title}`
    }

    @action
    toggle() {
        this.finished = !this.finished
    }
}
```

To keep decorators, switch your compiler to Stage 3 decorators, add `accessor` to observable fields, and remove `makeObservable(this)` from decorated classes:

```javascript
import { observable, computed, action } from "mobx"

class Todo {
    @observable accessor title = ""
    @observable accessor finished = false

    @computed
    get label() {
        return `${this.finished ? "[DONE]" : "[OPEN]"} ${this.title}`
    }

    @action
    toggle() {
        this.finished = !this.finished
    }
}
```

For TypeScript users, use TypeScript 5 or later and disable or remove the `experimentalDecorators` flag.
For Babel users, use `@babel/plugin-proposal-decorators` with the current Stage 3 configuration. See [Enabling decorators {🚀}](enabling-decorators.md) for the exact compiler setup.

If you don't want to keep decorators, remove them and pass an explicit annotation map to `makeObservable`:

```javascript
import { makeObservable, observable, computed, action } from "mobx"

class Todo {
    title = ""
    finished = false

    constructor() {
        makeObservable(this, {
            title: observable,
            finished: observable,
            label: computed,
            toggle: action
        })
    }

    get label() {
        return `${this.finished ? "[DONE]" : "[OPEN]"} ${this.title}`
    }

    toggle() {
        this.finished = !this.finished
    }
}
```

## Proxy support is required

MobX 7 requires native Proxy support and no longer includes the ES5 fallback implementation.

Remove `useProxies` from `configure` calls:

```diff
 import { configure } from "mobx"

 configure({
     enforceActions: "observed",
-    useProxies: "ifavailable"
 })
```

This applies to all previous `useProxies` values: `"always"`, `"never"` and `"ifavailable"`.

Also remove `{ proxy: false }` from `observable`, `observable.object` and `observable.array` options:

```diff
-const todos = observable.object({}, {}, { proxy: false })
+const todos = observable.object({})
```

## Removed `trace`

The `trace` API has been removed. For debugging reactivity, use [`getDependencyTree`](api.md#getdependencytree), [`getObserverTree`](api.md#getobservertree), [`spy`](analyzing-reactivity.md#spy), the MobX developer tools, or packages such as `mobx-log`.

```javascript
import { autorun, getDependencyTree } from "mobx"

const disposer = autorun(() => {
    console.log(message.title)
})

console.log(getDependencyTree(disposer))
```

## Replacing `Provider` and `inject`

`Provider` and `inject` were removed. Use React context directly. Keep the context value stable and mutate the observable store instead of replacing the provider value.

Before:

```javascript
import { Provider, inject, observer } from "mobx-react"

// prettier-ignore
const UserName = inject("userStore")(
    observer(({ userStore }) => <span>{userStore.name}</span>)
)

const App = ({ userStore }) => (
    <Provider userStore={userStore}>
        <UserName />
    </Provider>
)
```

After, using a function component:

```javascript
import React, { createContext, useContext } from "react"
import { observer } from "mobx-react"

const RootStoreContext = createContext(null)

export const RootStoreProvider = ({ rootStore, children }) => (
    <RootStoreContext.Provider value={rootStore}>{children}</RootStoreContext.Provider>
)

export const useRootStore = () => {
    const store = useContext(RootStoreContext)
    if (!store) {
        throw new Error("RootStoreProvider is missing")
    }
    return store
}

const UserName = observer(() => {
    const { userStore } = useRootStore()
    return <span>{userStore.name}</span>
})

const App = () => (
    <RootStoreProvider rootStore={{ userStore: new UserStore() }}>
        <UserName />
    </RootStoreProvider>
)
```

After, using a class component:

```javascript
import React from "react"
import { observer } from "mobx-react"

const RootStoreContext = React.createContext(null)

class UserName extends React.Component {
    static contextType = RootStoreContext

    render() {
        const { userStore } = this.context
        return <span>{userStore.name}</span>
    }
}

const ObservedUserName = observer(UserName)
```
