---
title: Configuring MobX
sidebar_label: Configuring MobX
hide_title: true
---

# Configuring MobX

MobX has several configuration depending on how you prefer to use MobX, which JavaScript engines you want to target, and whether you want MobX to hint at best practices.
Most configuration options can be set by using the `configure` method as provided by MobX.

## Proxy support

By default MobX uses proxies to make arrays and plain objects observable. Proxies provide the best performance and most concistent behavior accross environments.
However, if you are targetting an environment that doesn't support proxies, proxy support has to be disabled.
Most notably this is the case when targetting Internet Explorer or React Native without using the Hermes engine.

Proxy support can be disabled by using `configure`:

```typescript
import { configure } from "mobx"

configure({
    useProxies: "never"
})
```

Accepted values for the `useProxies` configuration are:

-   `"always"` (default): MobX is expected to only run in environments with [`Proxy` support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy). MobX will error if these are not available.
-   `"never"`: Proxies are never used. MobX falls back on non-proxy alternatives. This is compatible with all ES5 environments, but causes various [limitations](../best/limitations-without-proxies.md).
-   `"ifavailable"`: (Experimental option) Proxies are used if they are available, and otherwise MobX falls back to non-proxy alternatives. The benefit of this mode is that MobX will try to warn if API's or language features that wouldn't work in ES5 enviroments are used, triggering errors when hitting an ES5 limitation when running on a modern environment.

Note: before MobX 6 one had to pick either MobX 4 for older engines, or MobX 5 for new engines. However, MobX 6 supports both, although polyfills for certain api's like Map will be required when targetting older JavaScript engines.

Note: Proxies cannot be polyfilled. Even though polyfills do exist, they don't support the full spec and are unsuitable for MobX. Don't use them.

### Limitations without Proxy support

1.  Observable arrays are not real arrays, so they won't pass the `Array.isArray()` check. The practical consequence is that you often need to `.slice()` the array first (to get a real array shallow copy) before passing to third party libraries. For example using observable arrays in concat arrays doesn't work as expected. So '.slice()' them first.
2.  Adding or deleting properties to existing observable plain objects after creation is not automatically picked up. If you intend to use objects as index based lookup maps, in other words, as dymamic collection of things, use observable maps instead.

## Decorator support

For enabling experimental decorator support see [Decorators](../best/decorators).

## Linting

TODO

## Further options

Usage:

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
