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

Sets global behavior settings on the active MobX instance.
Use this to change how MobX behaves as a whole.

[&laquo;details&raquo;](configure.md)

## Object API

The Object API is an optional, generic API that enables manipulating observable maps, objects and arrays with the same API. This is specially useful
in [environments without `Proxy` support](../best/limitations-without-proxies.md).

### `values`

Return all values in collection as array.

### `keys`

Return all keys/indices in collection as array.

### `entries`

Return a `[key, value]` pair for all entries in the collection
as an array.

### `set`

Update collection.

### `remove`

Remove item from collection.

### `has`

Check for membership in collection.

### `get`

Get value from collection with key.

[&laquo;details&raquo;](object-api.md)

# Development utilities

_The following api's might come in handy if you want to build cool tools on top of MobX or if you want to inspect the internal state of MobX_

### `"mobx-react-devtools"` package

The mobx-react-devtools is a powerful package that helps you to investigate the performance and dependencies of your react components.
Also has a powerful logger utility based on `spy`.

[&laquo;details&raquo;](../best/devtools.md)

### `trace`

Log when value is invalidated, or set debugger breakpoint.

[&laquo;trace&raquo;](../best/trace.md)

### `spy`

Registers a global spy listener that listens to all events that happen in MobX.

[&laquo;trace&raquo;](spy.md)

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
