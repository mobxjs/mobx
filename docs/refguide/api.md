---
title: MobX API Reference
sidebar_label: API overview
hide_title: true
---

# MobX API Reference

# Core API

_These are the most important MobX API's._

> Understanding `observable`, `computed`, `reaction` and `action` is enough
> to master MobX and use it in your applications!

## Creating observables

### `makeObservable`

Declare observables, computeds and actions in the class
constructor.

[&laquo;`details`&raquo;](make-observable.md)

### `makeAutoObservable`

Automatically derive observables, computeds and actions in the class constructor.

[&laquo;`details`&raquo;](make-observable.md)

### `observable`

Mark a property as observable.

[&laquo;`details`&raquo;](make-observable.md)

### `observable(value)`

Make a value observable.

[&laquo;`details`&raquo;](observable.md)

### `observable.object(value, decorators?, options?)`

Creates a clone of the provided object and makes all its properties observable.

[&laquo;`details`&raquo;](object.md)

### `observable.array(value, options?)`

Creates a new observable array based on the provided value.

[&laquo;`details`&raquo;](array.md)

### `observable.map(value, options?)`

Creates a new observable Map based on the provided value.

[&laquo;`details`&raquo;](map.md)

### `observable.set(value, options?)`

Create a new observable Set based on the provided value.

[&laquo;`details`&raquo;](set.md)

### `observable` modifiers

Modify observable behavior.

[&laquo;details&raquo;](modifiers.md)

### `extendObservable`

Make an existing object observable.

[&laquo;details&raquo;](extend-observable.md)

### `observable.box(value, options?)`

Creates an observable _box_ that stores an observable reference to a value.

[&laquo;`details`&raquo;](boxed.md)

## `computed`

Computed values derived from observables and other computeds.

[&laquo;details&raquo;](computed.md)

## Actions

Actions are anything that modify the state.

[&laquo;details&raquo;](action.md)

### `runInAction`

One-time actions.

[&laquo;details&raquo;](action.md#runinaction)

### `flow`

MobX friendly replacement for `async` / `await`.

[&laquo;details&raquo;](flow.md)

## React integration

### `observer`

A higher order component you can use to make a React component re-render when observables change.

Is part of the `mobx-react` package.

[&laquo;details&raquo;](../react/react-integration.md)

### `Provider` (`mobx-react` package)

[*Deprecated*] Can be used to pass stores to child components using React's context mechanism. Use the [React context mechanism](https://reactjs.org/docs/context.html) instead.

See the [`mobx-react` docs](https://github.com/mobxjs/mobx-react#provider-experimental).

### `inject` (`mobx-react` package)

[*Deprecated*] Higher order component and counterpart of `Provider`. Use the [React context mechanism](https://reactjs.org/docs/context.html) instead.

## Reactions & Derivations

### `autorun`

Rerun a function each time anything it observes changes.

[&laquo;details&raquo;](autorun.md)

### `reaction`

Rerun a side-effect when data it observes changes.

[&laquo;details&raquo;](reaction.md)

### `when`

Execute a side-effect once when a observable condition becomes true.

[&laquo;details&raquo;](when.md)

### `onReactionError`

Usage: `onReactionError(handler: (error: any, derivation) => void)`

This function attaches a global error listener, which is invoked for every error that is thrown from a _reaction_.
This can be used for monitoring or test purposes.

---

# Utilities

_Here are some utilities that might make working with observable objects or computed values more convenient.
More, less trivial utilities can be found in the \* [mobx-utils](https://github.com/mobxjs/mobx-utils) package._

### `toJS`

Converts observable data structures back to plain javascript objects, ignoring computed values.

[&laquo;details&raquo;](tojson.md)

## `isObservable`

Is a value observable?

[&laquo;details&raquo;](observable.md#isobservable)

## `isObservableProp`

Is a property observable?

[&laquo;details&raquo;](observable.md#isobservableprop)

## `isObservableArray`

Is value an observable array?

[&laquo;details&raquo;](array.md#isobservablearray)

## `isObservableMap`

Is value an observable map?

[&laquo;details&raquo;](map.md#isobservablemap)

## `isObservableSet`

Is value an observable set?

[&laquo;details&raquo;](set.md#isobservableset)

## `isObservableObject`

Is value an observable object?

[&laquo;details&raquo;](object.md#isobservableobject)

## `isBoxedObservable`

Is value an observable box?

[&laquo;details&raquo;](boxed.md#isboxedobservable)

## `isArrayLike`

[Without Proxy support]

Is this an array of some type, observable or not?

[&laquo;details&raquo;](array.md#isarraylike)

### `isAction`

Is this an action?

[&laquo;details&raquo;](action.md#isaction)

### `isComputed`

Is this a boxed computed value?

[&laquo;details&raquo;](computed.md#iscomputed)

### `isComputedProp`

Is this a computed property?

[&laquo;details&raquo;](computed.md#iscomputedprop)

### `intercept`

Intercept changes before they are applied to an observable api.

[&laquo;details&raquo;](observe.md)

### `observe`

Low-level api that can be used to observe a single observable value.

[&laquo;details&raquo;](observe.md)

### `onBecomeObserved`

Hook for when something becomes observed.

[&laquo;details&raquo;](on-become-observed.md)

### `onBecomeUnobserved`

Hook for when something stops being observed.

[&laquo;details&raquo;](on-become-observed.md)

### `configure`

Usage: `configure(options)`.
Sets global behavior settings on the active MobX instance.
Use this to change how MobX behaves as a whole.

```javascript
import { configure } from "mobx"

configure({
    // ...
})
```

#### `arrayBuffer: number`

Increases the default created size of observable arrays to `arrayBuffer`, if the maximum size isn't yet there.

Observable arrays lazily create getters on members of `ObservableArray.prototype` starting at `0`.
This will create the members from `0` to `arrayBuffer` if they don't yet exist.
Use `arrayBuffer` if you know you'll have a common minimum array size and don't want to risk first creating those getters in hot code paths.
See also `observable`.

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

Allows overwriting computed values. This is useful for testing purposes _only_. Don't enable this
on production as it can cause memory-leaks.

```javascript
configure({ computedConfigurable: true })
```

#### `disableErrorBoundaries: boolean`

By default, MobX will catch and rethrow exceptions happening in your code to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions. This means exceptions are not propagated back to the original causing code and therefore you won't be able to catch them using try/catch.

There may be times when you want to catch those errors, for example when unit testing your reactions. You can disable this behaviour using `disableErrorBoundaries`.

```javascript
configure({ disableErrorBoundaries: true })
```

Please note that MobX won't recover from errors when using this configuration. For that reason, you may need to use `_resetGlobalState` after each exception. Example:

```js
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

> Prior to MobX 4, `_resetGlobalState` was `extras.resetGlobalState`.

#### `enforceActions`

Also known as "strict mode".
In strict mode, it is not allowed to change any state outside of an [`action`](action.md).
Accepted values:

-   `"never"` (default): State can be modified from anywhere
-   `"observed"`: All state that is observed _somewhere_ needs to be changed through actions. This is the recommended strictness mode in non-trivial applications.
-   `"always"`: State always needs be updated (which in practice also includes creation) in actions.

#### `isolateGlobalState: boolean`

Isolates the global state of MobX, when there are multiple instances of MobX in the same environment.
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

## Direct Observable manipulation

There is now an utility API that enables manipulating observable maps, objects and arrays with the same API. These api's are fully reactive, which means that even new property declarations can be detected by mobx if `set` is used to add them, and `values` or `keys` to iterate them.

-   **`values(thing)`** returns all values in the collection as array
-   **`keys(thing)`** returns all keys in the collection as array
-   **`entries(thing)`** returns a [key, value] pair for all entries in the collection as array
-   **`set(thing, key, value)`** or **`set(thing, { key: value })`** Updates the given collection with the provided key / value pair(s).
-   **`remove(thing, key)`** removes the specified child from the collection. For arrays splicing is used.
-   **`has(thing, key)`** returns true if the collection has the specified _observable_ property.
-   **`get(thing, key)`** returns the child under the specified key.

# Development utilities

_The following api's might come in handy if you want to build cool tools on top of MobX or if you want to inspect the internal state of MobX_

### `"mobx-react-devtools"` package

The mobx-react-devtools is a powerful package that helps you to investigate the performance and dependencies of your react components.
Also has a powerful logger utility based on `spy`.

[&laquo;details&raquo;](../best/devtools.md)

### `trace`

Usage:

-   `trace(enterDebugger?)`
-   `trace(Reaction object / ComputedValue object / disposer function, enterDebugger?)`
-   `trace(object, computedValuePropertyName, enterDebugger?)`

`trace` is a small utility that you can use inside a computed value or reaction.
If it is enabled, it will start logging when the value is being invalidated, and why.
If `enterDebugger` is set to true, and developer tools are enabled, the javascript engine
will break on the point where it is triggered.

[&laquo;trace&raquo;](../best/trace.md)

### `spy`

Usage: `spy(listener)`.
Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to _all_ observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the `mobx-react-devtools`.

[&laquo;details&raquo;](spy.md)

### `getAtom`

Usage: `getAtom(thing, property?)`.
Returns the backing _Atom_ of a given observable object, property, reaction etc.

### `getDebugName`

Usage: `getDebugName(thing, property?)`
Returns a (generated) friendly debug name of an observable object, property, reaction etc. Used by for example the `mobx-react-devtools`.

### `getDependencyTree`

Usage: `getDependencyTree(thing, property?)`.
Returns a tree structure with all observables the given reaction / computation currently depends upon.

### `getObserverTree`

Usage: `getObserverTree(thing, property?)`.
Returns a tree structure with all reactions / computations that are observing the given observable.

### `"mobx-react"` development hooks

The `mobx-react` package exposes the following additional api's that are used by the `mobx-react-devtools`:

-   `trackComponents()`: enables the tracking of `observer` based React components
-   `renderReporter.on(callback)`: callback will be invoked on each rendering of an `observer` enabled React component, with timing information etc
-   `componentByNodeRegistery`: ES6 WeakMap that maps from DOMNode to a `observer` based React component instance

# Internal functions

_The following methods are all used internally by MobX, and might come in handy in rare cases. But usually MobX offers more declarative alternatives to tackle the same problem. They might come in handy though if you try to extend MobX_

### `transaction`

_Transaction is a low-level api, it is recommended to use actions instead_

`transaction(worker: () => void)` can be used to batch a bunch of updates without notifying any observers until the end of the transaction.
`transaction` takes a single, parameterless `worker` function as argument and runs it.
No observers are notified until this function has completed.
`transaction` returns any value that was returned by the `worker` function.
Note that `transaction` runs completely synchronously.
Transactions can be nested. Only after completing the outermost `transaction` pending reactions will be run.

```javascript
import { observable, transaction, autorun } from "mobx"

const numbers = observable([])

autorun(() => console.log(numbers.length, "numbers!"))
// Prints: '0 numbers!'

transaction(() => {
    transaction(() => {
        numbers.push(1)
        numbers.push(2)
    })
    numbers.push(3)
})
// Prints: '3 numbers!'
```

### `untracked`

Untracked allows you to run a piece of code without establishing observers.
Like `transaction`, `untracked` is automatically applied by `(@)action`, so usually it makes more sense to use actions than to use `untracked` directly.
Example:

```javascript
const person = observable({
    firstName: "Michel",
    lastName: "Weststrate"
})

autorun(() => {
    console.log(
        person.lastName,
        ",",
        // this untracked block will return the person's firstName without establishing a dependency
        untracked(() => person.firstName)
    )
})
// prints: Weststrate, Michel

person.firstName = "G.K."
// doesn't print!

person.lastName = "Chesterton"
// prints: Chesterton, G.K.
```

### `createAtom`

Utility function that can be used to create your own observable data structures and hook them up to MobX.
Used internally by all observable data types.

[&laquo;details&raquo;](extending.md)
