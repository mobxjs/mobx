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

Usage:

-   `makeObservable(target, annotations?, options?)`

Convert object members into observables, computeds and actions.

[&laquo;`details`&raquo;](observable.md#makeObservable)

### `makeAutoObservable`

Usage:

-   `makeAutoObservable(target, overrides?, options?)`

Automatically convert object members into observables, computeds and actions.

[&laquo;`details`&raquo;](observable.md#makeAutoObservable)

### `extendObservable`

Usage:

-   `extendObservable(target, properties, overrides?, options?)

Can be used to introduced new properties on the `target` object and make them observable immediately. Basically a shorthand for `Object.assign(target, properties); makeAutoObservable(target, overrides, options);`. However existing properties on `target` won't be touched.

Old-fashioned constructor functions can leverage `extendObservable` nicely:

```javascript
function Person(firstName, lastName) {
    extendObservable(this, { firstName, lastName })
}

const person = new Person("Michel", "Weststrate")
```

It is possible to use `extendObservable` to add observable fields to an existing object after instantiation, but be careful that adding an observable property this way is in itself not a fact that can be observed.

### `observable`

Usage:

-   `observable` (annotation): Mark a property as observable.
-   `observable(source, overrides?, options?)`: Clones an object and makes it observable. Source can be a plain object, [array](#observable-array), [Map](#observable-map) or [Set](#observable-set).

[&laquo;`details`&raquo;](observable.md#observable)

### `observable.object`

Usage:

-   `observable.object(source, overrides?, options?)`

Alias for `observable(source, overrides?, options?)`. Creates a clone of the provided object and makes all its properties observable.

[&laquo;`details`&raquo;](observable.md#observable)

### `observable.array`

Usage

-   `observable.array(initialValues?, options?)`

Creates a new observable array based on the provided initial values.

Besides all language built-in Array functions, the following goodies are available as well on observable arrays:

-   `clear()` Remove all current entries from the array.
-   `replace(newItems)` Replaces all existing entries in the array with new ones.
-   `remove(value)` Remove a single item by value from the array. Returns `true` if the item was found and removed.

To recommend observable arrays back to plain arrays, it is recommend to use the `.slice()` method, or to convert recursively, see [toJS](#toJS)

The `{ deep: false }` option can be used to make this array shallowly observable, that is, values stored in it won't be converted to observables automatically.

### `observable.map`

Usage:

-   `observable.map(initialMap?, options?)`

Creates a new observable Map based on the provided initialMap.
Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
If you don't have Proxies enabled, creating observable maps is the recommended approach to create dynamically keyed collection.

The following functions are not in the Map spec but are available on observable Maps as well:

-   `toJSON()`. Returns a shallow plain object representation of this map. (For a deep copy use [toJS](#toJS)).
-   `merge(values)`. Copies all entries from the provided object into this map. `values` can be a plain object, array of entries or string-keyed ES6 Map.
-   `replace(values)`. Replaces the entire contents of this map with the provided values.

The `{ deep: false }` option can be used to make this map shallowly observable, that is, values stored in it won't be converted to observables automatically.

### `observable.set`

Usage:

-   `observable.set(initialSet?, options?)`

Create a new observable Set based on the provided value.
Use `set` whenever you want to create a dynamic set where the addition / removal of values needs to be observed, and where values can appear only once in the collection.

The `{ deep: false }` option can be used to make this set shallowly observable, that is, values stored in it won't be converted to observables automatically.

### `observable.ref`

Usage:

-   `observable.ref` (annotation)

Like the `observable` annotation, but only reassignments will be tracked. The assigned values themselves won't be made observable automatically. Use this if you intend to store for example immutable data in an observable field.

[&laquo;`details`&raquo;](observable.md#available-annotations)

### `observable.shallow`

Usage:

-   `observable.shallow` (annotation)

Like the `observable` annotation, except that any assigned value that is structurally equal to the current value will be ignored.

[&laquo;`details`&raquo;](observable.md#available-annotations)

### `observable.struct`

Usage:

-   `observable.struct` (annotation)

Like `observable.ref` but for collections; any collection assigned will be made observable, but the contents of the collection itself won't become observable.

[&laquo;`details`&raquo;](observable.md#available-annotations)

### `observable.deep`

Usage:

-   `observable.deep` (annotation)

Alias for the [`observable`](#observable) annotation.

[&laquo;`details`&raquo;](observable.md#available-annotations)

### `observable.box`

-   `observable.box(value, options?)`

All primitive values in JavaScript are immutable and hence per definition not observable.
Usually that is fine, as MobX usually can just make the _property_ that contains the value observable.

In rare cases it can be convenient to have an observable "primitive" that is not owned by an object.
For these cases it is possible to create an observable _box_ that manages such a primitive.

So `observable.box(value)` accepts any value and stores it inside a box.
The current value can be accessed through `.get()` and updated using `.set(newValue)`.

By default stored values will be turned into observables themselves if possible. This can be disabled by using the `deep: false` option.

```javascript
import { observable, autorun } from "mobx"

const cityName = observable.box("Vienna")

autorun(() => {
    console.log(cityName.get())
})
// prints 'Vienna'

cityName.set("Amsterdam")
// prints 'Amsterdam'
```

---

## Actions

_Actions are anything that modify the state._

### `action`

Usage:

-   `action` (annotation)
-   `action(fn)`

Marking things as action.

[&laquo;details&raquo;](action.md)

### `runInAction`

Usage:

-   `runInAction(fn)`

Create a one-time action that is immediately invoked.

[&laquo;details&raquo;](action.md#runinaction)

### `flow`

MobX friendly replacement for `async` / `await` that supports cancellation.

[&laquo;details&raquo;](action.md#using-flow-instead-of-asyncawait)

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

Usage:

-   `isAction(func)`

Returns `true` if the given function is marked as an `action`.

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
