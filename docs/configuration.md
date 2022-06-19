---
title: Configuration
sidebar_label: Configuration {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Configuration {🚀}

MobX has several configurations depending on how you prefer to use it, which JavaScript engines you want to target, and whether you want MobX to hint at best practices.
Most configuration options can be set by using the `configure` method.

## Proxy support

By default, MobX uses proxies to make arrays and plain objects observable. Proxies provide the best performance and most consistent behavior across environments.
However, if you are targeting an environment that doesn't support proxies, proxy support has to be disabled.
Most notably this is the case when targeting Internet Explorer or React Native without using the Hermes engine.

Proxy support can be disabled by using `configure`:

```typescript
import { configure } from "mobx"

configure({
    useProxies: "never"
})
```

Accepted values for the `useProxies` configuration are:

-   `"always"` (**default**): MobX expects to run only in environments with [`Proxy` support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) and it will error if such an environment is not available.
-   `"never"`: Proxies are not used and MobX falls back on non-proxy alternatives. This is compatible with all ES5 environments, but causes various [limitations](#limitations-without-proxy-support).
-   `"ifavailable"` (experimental): Proxies are used if they are available, and otherwise MobX falls back to non-proxy alternatives. The benefit of this mode is that MobX will try to warn if APIs or language features that wouldn't work in ES5 environments are used, triggering errors when hitting an ES5 limitation running on a modern environment.

**Note:** before MobX 6, one had to pick either MobX 4 for older engines, or MobX 5 for new engines. However, MobX 6 supports both, although polyfills for certain APIs like Map will be required when targetting older JavaScript engines.
Proxies cannot be polyfilled. Even though polyfills do exist, they don't support the full spec and are unsuitable for MobX. Don't use them.

### Limitations without Proxy support

1.  Observable arrays are not real arrays, so they won't pass the `Array.isArray()` check. The practical consequence is that you often need to `.slice()` the array first (to get a shallow copy of the real array) before passing it to third party libraries. For example, concatenating observable arrays doesn't work as expected, so `.slice()` them first.
2.  Adding or deleting properties of existing observable plain objects after creation is not automatically picked up. If you intend to use objects as index based lookup maps, in other words, as dynamic collections of things, use observable Maps instead.

It is possible to dynamically add properties to objects, and detect their additions, even when Proxies aren't enabled.
This can be achieved by using the [Collection utilities {🚀}](collection-utilities.md). Make sure that (new) properties are set using the `set` utility, and that the objects are iterated using one of the `values` / `keys` or `entries` utilities, rather than the built-in JavaScript mechanisms.
But, since this is really easy to forget, we instead recommend using observable Maps if possible.

## Decorator support

For enabling experimental decorator support check out the [Enabling decorators {🚀}](enabling-decorators.md) section.

## Linting options

To help you adopt the patterns advocated by MobX, a strict separation between actions, state and derivations, MobX can _"lint"_ your coding patterns at runtime by hinting at smells. To make sure MobX is as strict as possible, adopt the following settings and read on for their explanations:

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
It is fine to disable these rules to gain productivity once you are sure you (and your colleagues) grokked the mental model of MobX.

Also, occasionally you will have a case where you have to suppress the warnings triggered by these rules (for example by wrapping in `runInAction`).
That is fine, there are good exceptions to these recommendations.
Don't be fundamentalist about them.

Make sure to also try our [`eslint` plugin](https://github.com/mobxjs/mobx/blob/main/packages/eslint-plugin-mobx/README.md).
While some problems are discoverable statically, others are detectable only at runtime.
The plugin is intended to complement these rules, not to replace them.
The autofix feature can also help with the boilerplate code.

#### `enforceActions`

The goal of _enforceActions_ is that you don't forget to wrap event handlers in [`action`](actions.md).

Possible options:

-   `"observed"` (**default**): All state that is observed _somewhere_ needs to be changed through actions. This is the default, and the recommended strictness mode in non-trivial applications.
-   `"never"`: State can be changed from anywhere.
-   `"always"`: State always needs to be changed through actions, which in practice also includes creation.

The benefit of `"observed"` is that it allows you to create observables outside of actions and modify them freely, as long as they aren't used anywhere yet.

Since state should in principle always be created from some event handlers, and event handlers should be wrapped, `"always"` captures this the best. But you probably don't want to use this mode in unit tests.

In the rare case where you create observables lazily, for example in a computed property, you can wrap the creation ad-hoc in an action using `runInAction`.

#### `computedRequiresReaction: boolean`

Forbids the direct access of any unobserved computed value from outside an action or reaction.
This guarantees you aren't using computed values in a way where MobX won't cache them. **Default: `false`**.

In the following example, MobX won't cache the computed value in the first code block, but will cache the result in the second and third block:

```javascript
class Clock {
    seconds = 0

    get milliseconds() {
        console.log("computing")
        return this.seconds * 1000
    }

    constructor() {
        makeAutoObservable(this)
    }
}

const clock = new Clock()
{
    // This would compute twice, but is warned against by this flag.
    console.log(clock.milliseconds)
    console.log(clock.milliseconds)
}
{
    runInAction(() => {
        // Will compute only once.
        console.log(clock.milliseconds)
        console.log(clock.milliseconds)
    })
}
{
    autorun(() => {
        // Will compute only once.
        console.log(clock.milliseconds)
        console.log(clock.milliseconds)
    })
}
```

#### `observableRequiresReaction: boolean`

Warns about any unobserved observable access.
Use this if you want to check whether you are using observables without a "MobX context".
This is a great way to find any missing `observer` wrappers, for example in React components. But it will find missing actions as well. **Default: `false`**

```javascript
configure({ observableRequiresReaction: true })
```

**Note:** using propTypes on components that are wrapped with `observer` might trigger false positives for this rule.

#### `reactionRequiresObservable: boolean`

Warns when a reaction (e.g. `autorun`) is created without accessing any observables.
Use this to check whether you are unnecessarily wrapping React components with `observer`, wrapping functions with `action`, or find cases where you simply forgot to make some data structures or properties observable. **Default: `false`**

```javascript
configure({ reactionRequiresObservable: true })
```

#### `disableErrorBoundaries: boolean`

By default, MobX will catch and re-throw exceptions happening in your code to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions. This means exceptions are not propagated back to the original causing code and therefore you won't be able to catch them using try/catch.

By disabling error boundaries, exceptions can escape derivations. This might ease debugging, but might leave MobX and by extension your application in an unrecoverable broken state. **Default: `false`**.

This option is great for unit tests, but remember to call `_resetGlobalState` after each test, for example by using `afterEach` in jest, for example:

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

#### `safeDescriptors: boolean`

MobX makes some fields **non-configurable** or **non-writable** to prevent you from doing things that are not supported or would most likely break your code. However this can also prevent **spying/mocking/stubbing** in your tests.
`configure({ safeDescriptors: false })` disables this safety measure, making everything **configurable** and **writable**.
Note it doesn't affect existing observables, only the ones created after it's been configured.
<span style="color:red">**Use with caution**</span> and only when needed - do not turn this off globally for all tests, otherwise you risk false positives (passing tests with broken code). **Default: `true`**

```javascript
configure({ safeDescriptors: false })
```

## Further configuration options

#### `isolateGlobalState: boolean`

Isolates the global state of MobX when there are multiple instances of MobX active in the same environment. This is useful when you have an encapsulated library that is using MobX, living in the same page as the app that is using MobX. The reactivity inside the library will remain self-contained when you call `configure({ isolateGlobalState: true })` from it.

Without this option, if multiple MobX instances are active, their internal state will be shared. The benefit is that observables from both instances work together, the downside is that the MobX versions have to match. **Default: `false`**

```javascript
configure({ isolateGlobalState: true })
```

#### `reactionScheduler: (f: () => void) => void`

Sets a new function that executes all MobX reactions.
By default `reactionScheduler` just runs the `f` reaction without any other behavior.
This can be useful for basic debugging, or slowing down reactions to visualize application updates. **Default: `f => f()`**

```javascript
configure({
    reactionScheduler: (f): void => {
        console.log("Running an event after a delay:", f)
        setTimeout(f, 100)
    }
})
```
