---
title: Configuring MobX
sidebar_label: Configuring MobX
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Configuring MobX

MobX has several configuration depending on how you prefer to use MobX, which JavaScript engines you want to target, and whether you want MobX to hint at best practices.
Most configuration options can be set by using the `configure` method.

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

## Linting options

To help you to adopt the patterns advocated by MobX, to adopt a strict separation between actions, state and derivations, MobX can "lint" your coding patterns at runtime by hinting at smells. To make sure MobX is as strict as possible, adopt the following settings (read on for the explanation of those settings):

```typescript
import { configure } from "mobx"

configure({
    enforceActions: "always",
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    observableRequiresReaction: true,
    disableErrorBoundaries: true
})
```

At some point you will discover that this level of strictness can be pretty annoying.
It is fine to disable these rules to gain productivity once you are sure you (and your collegues) grokked the mental model of MobX.

Also, occassionally you will have a case where you have to supress the warnings triggered by these rules (for example by wrapping in `runInAction`).
That is fine, there are good exceptions to these recommendations.
Don't be fundamentalistic about them.

#### `enforceActions`

The goal of _enforceActions_ is that you don't forget to wrap event handlers in [`action`](action.md).

Possible options:

-   `"observed"` (default): All state that is observed _somewhere_ needs to be changed through actions. This is the default, and the recommended strictness mode in non-trivial applications.
-   `"never"`: State can be modified from anywhere
-   `"always"`: State always needs be updated (which in practice also includes creation) in actions.

The benefit of `"observed"` is that it allows you to create observables outside actions and modify them freely, as long as they aren't used anywhere yet.

Since state should in principle always be created from some event handlers, and event handlers should be wrapped, `"always"` captures this the best. But probably you don't want to use this mode in unit tests.

In the rare case where you create observables lazily, for example in a computed property, you can wrap the creation ad-hoc in an action using `runInAction`.

#### `computedRequiresReaction: boolean`

Forbids the direct access of any unobserved computed value from outside an action or reaction.
This makes sure you aren't using computed values in a way where MobX won't cache them.
For example, in the following example, MobX won't cache the compute value in the first code block, but will cache the result in the second and third block:

```javascript
class Clock {
    seconds = 0

    get milliseconds() {
        console.log("computing")
        return this.secons * 1000
    }

    constructor() {
        makeAutoObservable(this)
    }
}

const clock = new Clock()
{
    // This would compute twice, but is warned against by this flag
    console.log(clock.milliseconds)
    console.log(clock.milliseconds)
}
{
    runInAction(() => {
        // will compute only once
        console.log(clock.milliseconds)
        console.log(clock.milliseconds)
    })
}
{
    autorun(() => {
        // will compute only once
        console.log(clock.milliseconds)
        console.log(clock.milliseconds)
    })
}
```

#### `observableRequiresReaction: boolean`

Warns about any unobserved observable access.
Use this if you want to check whether you are using observables without a "MobX context".
This is a great way to find any missing `observer` wrappers for example in React components, but it will find missing actions as well.

Note that using propTypes on components that are observer might trigger false positives for this rule.

```javascript
configure({ observableRequiresReaction: true })
```

#### `reactionRequiresObservable: boolean`

Warns when a reaction (eg `autorun`) is created without accessing any observables.
Use this to check whether you are unneededly wrapping react components with `observer`, accidentally wrapping functions with `action` will they should be tracked by the autorun, or find cases where you simply forget to make some data structures or properties observable.

```javascript
configure({ reactionRequiresObservable: true })
```

#### `disableErrorBoundaries: boolean`

By default, MobX will catch and rethrow exceptions happening in your code to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions. This means exceptions are not propagated back to the original causing code and therefore you won't be able to catch them using try/catch.

By disabling error boundaries, exceptions can escape derivations. This might ease debugging, but might leave MobX and by extension your application in an unrecoverable broken state.

This option is great for unit tests, but to call `_resetGlobalState` after each test, for example by using `afterEach` in jest. Example:

```js
import { _resetGlobalState, observable, autorun, configure } from "mobx"

configure({ disableErrorBoundaries: true })

test("Throw if age is negative", () => {
    expect(() => {
        const age = observable.box(10)
        autorun(() => {
            if (age.get() < 0) throw new Error("Age should not be negative")
        })
        age.set(-1)
    }).toThrow("Age should not be negative")
})

afterEach(() => {
    _resetGlobalState()
})
```

## Further configuration options

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
