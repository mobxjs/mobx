---
title: Configuring MobX
sidebar_label: Configuring MobX
hide_title: true
---

# Configuring MobX

[⚛️] Usage:

-   `configure(options)`.

Sets global behavior settings on the active MobX instance. Use this to change how MobX behaves as a whole.

```javascript
import { configure } from "mobx"

configure({
    // ...
})
```

## Options

#### `arrayBuffer: number`

Increases the default created size of observable arrays to `arrayBuffer`, if the maximum size isn't yet there.

Observable arrays lazily create getters on members of `ObservableArray.prototype` starting at `0`.
This will create the members from `0` to `arrayBuffer` if they don't yet exist.
Use `arrayBuffer` if you know you'll have a common minimum array size and don't want to risk first creating those getters in hot code paths.

#### `computedRequiresReaction: boolean`

Forbids the access of any unobserved computed value.
Use this if you want to check whether you are using computed properties without a reactive context.

```javascript
configure({ computedRequiresReaction: true })
```

#### `observableRequiresReaction: boolean`

Warns about any unobserved observable access.
Use this if you want to check whether you are using observables without a reactive context (eg not inside an autorun, action, or react component without observer wrapping).

```javascript
configure({ observableRequiresReaction: true })
```

#### `reactionRequiresObservable: boolean`

Warns when a reaction (eg `autorun`) is created without any observable access.
Use this to check whether you are unneededly wrapping react components with `observer`, or to find possible related bugs.

```javascript
configure({ reactionRequiresObservable: true })
```

#### `computedConfigurable: boolean`

Allows overwriting computed values. This is useful for testing purposes _only_. Don't enable this on production as it can cause memory-leaks.

```javascript
configure({ computedConfigurable: true })
```

#### `disableErrorBoundaries: boolean`

By default, MobX will catch and rethrow exceptions happening in your code to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions. This means exceptions are not propagated back to the original causing code and therefore you won't be able to catch them using try/catch.

There may be times when you want to catch those errors, for example when unit testing your reactions. You can disable this behavior using `disableErrorBoundaries`.

```javascript
configure({ disableErrorBoundaries: true })
```

Please note that MobX won't recover from errors when using this configuration. For that reason, you may need to use `_resetGlobalState` after each exception. Example:

```js
import { _resetGlobalState } from "mobx"

configure({ disableErrorBoundaries: true })

test("Throw if age is negative", () => {
    expect(() => {
        const age = observable.box(10)
        autorun(() => {
            if (age.get() < 0) throw new Error("Age should not be negative")
        })
        age.set(-1)
    }).toThrow()
    _resetGlobalState() // Needed after each exception
})
```

#### `enforceActions`

Accepted values:

-   `"observed"` (default): All state that is observed _somewhere_ needs to be changed through actions. This is the default, and the recommended strictness mode in non-trivial applications.
-   `"never"`: State can be modified from anywhere
-   `"always"`: State always needs be updated (which in practice also includes creation) in actions.

`enforcedActions` set to `observed` (or `always`) is also known as _strict mode_. In strict mode, it is not allowed to change any state outside of an [`action`](action.md).

#### `isolateGlobalState: boolean`

Isolates the global state of MobX when there are multiple instances of MobX in the same environment.

This is useful when you have an encapsulated library that is using MobX, living in the same page as the app that is using MobX.

The reactivity inside the library will remain self-contained when you call `configure({isolateGlobalState: true})` inside the library.

Without this options, if multiple MobX instances are active, the internal state will be shared. The benefit is that observables from both instances work together, the downside is that the MobX versions have to match.

```javascript
configure({ isolateGlobalState: true })
```

#### `reactionScheduler: (f: () => void) => void`

Sets a new function that executes all MobX reactions.
By default `reactionScheduler` just runs the `f` reaction without any other behavior.
This can be useful for basic debugging, or slowing down reactions to visualize application updates.

```javascript
configure({
    reactionScheduler: (f): void => {
        console.log("Running an event after a delay:", f)
        setTimeout(f, 100)
    }
})
```

### `useProxies`

Accepted values:

-   `"always"` (default): MobX is expected to only run in environments with [`Proxy` support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy). It is an error if these are not available.
-   `"never"`: Proxies are never used. MobX falls back on non-proxy alternatives. This is compatible with all ES5 environments, but causes various [limitations](../best/limitations-without-proxies.md).
-   `"ifavailable"`: Proxies are used if they are available, and otherwise MobX falls back to non-proxy alternatives. This causes various [limitations](../best/limitations-without-proxies.md). You still need to write code taking these limitations into account.
