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

MobX requires [`Proxy` support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to make arrays and plain objects observable.
Proxies provide the best performance and most consistent behavior across environments.

MobX 7 does not include the older ES5 fallback implementation and no longer supports `configure({ useProxies })`.
Use MobX 6 if you need to support environments without Proxy support, such as Internet Explorer or older React Native versions.

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
