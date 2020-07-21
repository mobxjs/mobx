---
title: MobX API Reference
sidebar_label: API overview
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX API Reference

# Core API

_These are the most important MobX API's._

> Understanding `observable`, `computed`, `reaction` and `action` is enough
> to master MobX and use it in your applications!

## Creating observables

_Making things observable_

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

## Actions

_Actions are anything that modify the state._

### `action`

Marking things as action.

[&laquo;details&raquo;](action.md)

### `runInAction`

One-time actions.

[&laquo;details&raquo;](action.md#runinaction)

### `flow`

MobX friendly replacement for `async` / `await`.

[&laquo;details&raquo;](flow.md)

## Computed

_Computed values derived from observables and other computeds._

### `computed`

Marking things as computed.

[&laquo;details&raquo;](computed.md)

## React integration

From the `mobx-react` package.

### `observer`

A higher order component you can use to make a React component re-render when observables change.

Is part of the `mobx-react` package.

[&laquo;details&raquo;](../react/react-integration.md)

## Reactions

Side-effects for observables.

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

## Utilities

Here are some utilities that might make working with observable objects or computed values more convenient.
More, less trivial utilities can be found in the [mobx-utils](https://github.com/mobxjs/mobx-utils) package.

### `toJS`

Converts observable data structures back to plain javascript objects, ignoring computed values.

[&laquo;details&raquo;](tojson.md)

### `isArrayLike`

[Without Proxy support]

Is this an array of some type, observable or not?

[&laquo;details&raquo;](array.md#isarraylike)

## Configuration

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

## Introspection utilities

The following APIs might come in handy if you want to inspect the internal state of MobX or want to build cool tools on top of MobX.

### `isObservable`

Is a value observable?

[&laquo;details&raquo;](observable.md#isobservable)

### `isObservableProp`

Is a property observable?

[&laquo;details&raquo;](observable.md#isobservableprop)

### `isObservableArray`

Is value an observable array?

[&laquo;details&raquo;](array.md#isobservablearray)

### `isObservableMap`

Is value an observable map?

[&laquo;details&raquo;](map.md#isobservablemap)

### `isObservableSet`

Is value an observable set?

[&laquo;details&raquo;](set.md#isobservableset)

### `isObservableObject`

Is value an observable object?

[&laquo;details&raquo;](object.md#isobservableobject)

### `isBoxedObservable`

Is value an observable box?

[&laquo;details&raquo;](boxed.md#isboxedobservable)

### `isAction`

Is this an action?

[&laquo;details&raquo;](action.md#isaction)

### `isComputed`

Is this a boxed computed value?

[&laquo;details&raquo;](computed.md#iscomputed)

### `isComputedProp`

Is this a computed property?

[&laquo;details&raquo;](computed.md#iscomputedprop)

### `trace`

Log when value is invalidated, or set debugger breakpoint.

[&laquo;trace&raquo;](../best/trace.md)

### `spy`

Registers a global spy listener that listens to all events that happen in MobX.

[&laquo;trace&raquo;](spy.md)

### `getDebugName`

Returns a (generated) friendly debug name

[&laquo;trace&raquo;](introspection-utils.md#getdebugname)

### `getDependencyTree`

Returns a tree structure with all observables the given reaction / computation currently depends upon.

[&laquo;trace&raquo;](introspection-utils.md#getdependencytree)

### `getObserverTree`

Returns a tree structure with all reactions / computations that are observing the given observable.

[&laquo;trace&raquo;](introspection-utils.md#getobservertree)

## Extending MobX

In the rare case you want to extend MobX itself.

### `createAtom`

Utility function that can be used to create your own observable data structures and hook them up to MobX. Used internally by all observable data types.

[&laquo;details&raquo;](extending.md)

### `getAtom`

Returns the backing atom.

[&laquo;trace&raquo;](introspection-utils.md#getatom)

### `transaction`

Wrap code in a transaction.

[&laquo;trace&raquo;](internals.md#transaction)

### `untracked`

Untracked allows you to run a piece of code without establishing observers.

[&laquo;trace&raquo;](internals.md#untracked)
