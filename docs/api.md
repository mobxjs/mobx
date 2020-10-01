---
title: MobX API Reference
sidebar_label: MobX API Reference
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX API Reference

Functions marked with {🚀} are considered advanced, and should typically not be needed.
Consider downloading our handy cheat sheet that explains all important APIs on a single page:

<div class="cheat"><a href="https://gum.co/fSocU"><button title="Download the MobX 6 cheat sheet and sponsor the project">Download the MobX 6 cheat sheet</button></a></div>

## Core APIs

_These are the most important MobX APIs._

> Understanding [`observable`](#observable), [`computed`](#computed), [`reaction`](#reaction) and [`action`](#action) is enough to master and use MobX in your applications!

## Creating observables

_Making things observable._

### `makeObservable`

[**Usage**](observable-state.md#makeobservable): `makeObservable(target, annotations?, options?)`

Properties, entire objects, arrays, Maps and Sets can all be made observable.

### `makeAutoObservable`

[**Usage**](observable-state.md#makeautoobservable): `makeAutoObservable(target, overrides?, options?)`

Automatically make properties, objects, arrays, Maps and Sets observable.

### `extendObservable`

{🚀} Usage: `extendObservable(target, properties, overrides?, options?)`

Can be used to introduce new properties on the `target` object and make them observable immediately. Basically a shorthand for `Object.assign(target, properties); makeAutoObservable(target, overrides, options);`. However, existing properties on `target` won't be touched.

Old-fashioned constructor functions can nicely leverage `extendObservable`:

```javascript
function Person(firstName, lastName) {
    extendObservable(this, { firstName, lastName })
}

const person = new Person("Michel", "Weststrate")
```

It is possible to use `extendObservable` to add observable fields to an existing object after instantiation, but be careful that adding an observable property this way is in itself not a fact that can be observed.

### `observable`

[**Usage**](observable-state.md#observable): `observable(source, overrides?, options?)` or `observable` _(annotation)_

Clones an object and makes it observable. Source can be a plain object, array, Map or Set. By default, `observable` is applied recursively. If one of the encountered values is an object or array, that value will be passed through `observable` as well.

### `observable.object`

{🚀} [**Usage**](observable-state.md#observable): `observable.object(source, overrides?, options?)`

Alias for `observable(source, overrides?, options?)`. Creates a clone of the provided object and makes all of its properties observable.

### `observable.array`

{🚀} Usage: `observable.array(initialValues?, options?)`

Creates a new observable array based on the provided `initialValues`.
To convert observable arrays back to plain arrays, use the `.slice()` method, or check out [toJS](#tojs) to convert them recursively.
Besides all the language built-in array functions, the following goodies are available on observable arrays as well:

-   `clear()` removes all current entries from the array.
-   `replace(newItems)` replaces all existing entries in the array with new ones.
-   `remove(value)` removes a single item by value from the array and returns `true` if the item was found and removed.

If the values in the array should not be turned into observables automatically, use the `{ deep: false }` option to make the array shallowly observable.

### `observable.map`

{🚀} Usage: `observable.map(initialMap?, options?)`

Creates a new observable [ES6 Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) based on the provided `initialMap`.
They are very useful if you don't want to react just to the change of a specific entry, but also to their addition and removal.
Creating observable Maps is the recommended approach for creating dynamically keyed collections if you don't have [enabled Proxies](configuration.md#proxy-support).

Besides all the language built-in Map functions, the following goodies are available on observable Maps as well:

-   `toJSON()` returns a shallow plain object representation of this Map (use [toJS](#tojs) for a deep copy).
-   `merge(values)` copies all entries from the provided `values` (plain object, array of entries or a string-keyed ES6 Map) into this Map.
-   `replace(values)` replaces the entire contents of this Map with the provided `values`.

If the values in the Map should not be turned into observables automatically, use the `{ deep: false }` option to make the Map shallowly observable.

### `observable.set`

{🚀} Usage: `observable.set(initialSet?, options?)`

Creates a new observable [ES6 Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) based on the provided `initialSet`. Use it whenever you want to create a dynamic set where the addition and removal of values needs to be observed, but where values can appear only once in the entire collection.

If the values in the Set should not be turned into observables automatically, use the `{ deep: false }` option to make the Set shallowly observable.

### `observable.ref`

[**Usage**](observable-state.md#available-annotations): `observable.ref` _(annotation)_

Like the `observable` annotation, but only reassignments will be tracked. The assigned values themselves won't be made observable automatically. For example, use this if you intend to store immutable data in an observable field.

### `observable.shallow`

[**Usage**](observable-state.md#available-annotations): `observable.shallow` _(annotation)_

Like the `observable` annotation, except that any assigned value that is structurally equal to the current value will be ignored.

### `observable.struct`

{🚀} [**Usage**](observable-state.md#available-annotations): `observable.struct` _(annotation)_

Like the `observable.ref` annotation, but for collections. Any collection assigned will be made observable, but the contents of the collection itself won't become observable.

### `observable.deep`

{🚀} [**Usage**](observable-state.md#available-annotations): `observable.deep` _(annotation)_

Alias for the [`observable`](#observable) annotation.

### `observable.box`

{🚀} Usage: `observable.box(value, options?)`

All primitive values in JavaScript are immutable and hence per definition not observable.
Usually that is fine, as MobX can just make the _property_ that contains the value observable.
In rare cases, it can be convenient to have an observable _primitive_ that is not owned by an object.
For such cases, it is possible to create an observable _box_ that manages such a _primitive_.

`observable.box(value)` accepts any value and stores it inside a box. The current value can be accessed through `.get()` and updated using `.set(newValue)`.

```javascript
import { observable, autorun } from "mobx"

const cityName = observable.box("Vienna")

autorun(() => {
    console.log(cityName.get())
})
// Prints: 'Vienna'

cityName.set("Amsterdam")
// Prints: 'Amsterdam'
```

If the values in the box should not be turned into observables automatically, use the `{ deep: false }` option to make the box shallowly observable.

---

## Actions

_An action is any piece of code that modifies the state._

### `action`

[**Usage**](actions.md): `action(fn)` or `action` _(annotation)_

Use on functions that intend to modify the state.

### `runInAction`

{🚀} [**Usage**](actions.md#runinaction): `runInAction(fn)`

Create a one-time action that is immediately invoked.

### `flow`

[**Usage**](actions.md#using-flow-instead-of-async--await-): `flow(fn)` or `flow` _(annotation)_

MobX friendly replacement for `async` / `await` that supports cancellation.

### `flowResult`

[**Usage**](actions.md#using-flow-instead-of-async--await-): `flowResult(flowFunctionResult)`

For TypeScript users only. Utility that casts the output of the generator to a promise.
This is just a type-wise correction for the promise wrapping done by `flow`. At runtime it directly returns the inputted value.

## Computeds

_Computed values can be used to derive information from other observables._

### `computed`

[**Usage**](computeds.md): `computed(fn, options?)` or  `computed(options?)` _(annotation)_

Creates an observable value that is derived from other observables, but won't be recomputed unless one of the underlying observables changes.

## React integration

From the `mobx-react` / `mobx-react-lite` package.

### `observer`

Usage:

-   `observer(functionComponent)`
-   `observer(classComponent)`

A higher order component you can use to make a React component re-render when observables change.
Is part of the `mobx-react` / `mobx-react-lite` package.

[&laquo;details&raquo;](react-integration.md)

### `Observer`

Usage:

-   `<Observer>{() => rendering}</Observer>`

Renders the given render function, and automatically re-renders it once one of the observables used in the render function changes.
Is part of the `mobx-react` / `mobx-react-lite` package.

[&laquo;details&raquo;](react-integration.md#callback-components-might-require-observer)

### `useLocalObservable`

Usage:

-   `useLocalObservable(() => source, annotations?)`

`useLocalObservable` creates a new observable object using `makeObservable`, and keeps it around in the in the component for the entire life-cycle of the component.
Is part of the `mobx-react` / `mobx-react-lite` package.

[&laquo;details&raquo;](react-integration.md#using-local-observable-state-in-observer-components)

## Reactions

Side effects for observables.

### `autorun`

Usage:

-   `autorun(() => effect, options?)`

Rerun a function each time anything it observes changes.

[&laquo;details&raquo;](reactions.md#autorun)

### `reaction`

Usage:

-   `reaction(() => data, data => effect, options?)`

Rerun a side effect when any data selected before changes.

[&laquo;details&raquo;](reactions.md#reaction)

### `when`

Usage:

-   `when(() => condition, () => effect, options?)`
-   `await when(() => condition, options?)`

Execute a side effect once when a observable condition becomes true.

[&laquo;details&raquo;](reactions.md#when)

## Utilities

Here are some utilities that might make working with observable objects or computed values more convenient.
More, less trivial utilities can be found in the [mobx-utils](https://github.com/mobxjs/mobx-utils) package.

### `onReactionError`

{🚀} Usage:

-   `onReactionError(handler: (error: any, derivation) => void)`

This function attaches a global error listener, which is invoked for every error that is thrown from a _reaction_.
This can be used for monitoring or test purposes.

### `intercept`

{🚀} Usage:

-   `intercept(array | set | map, listener)`
-   `intercept(object, propertyName, listener)`

Intercept changes before they are applied to an observable api.
Returns a disposer that stops the interception.

[&laquo;details&raquo;](intercept-and-observe.md)

### `observe`

{🚀} Usage:

-   `observe(array | set | map, listener)`
-   `observe(object, propertyName, listener)`

Low-level api that can be used to observe a single observable value.
Returns a disposer that stops the interception.

[&laquo;details&raquo;](intercept-and-observe.md)

### `onBecomeObserved`

{🚀} Usage:

-   `onBecomeObserved(observable, property?, listener: () => void)`

Hook for when something becomes observed.

[&laquo;details&raquo;](lazy-observables.md)

### `onBecomeUnobserved`

{🚀} Usage:

-   `onBecomeUnobserved(observable, property?, listener: () => void)`

Hook for when something stops being observed.

[&laquo;details&raquo;](lazy-observables.md)

### `toJS`

Usage:

-   `toJS(value)`

Recursively converts an (observable) object to a javascript _structure_.
Supports observable arrays, objects, maps and primitives.
Computed values and other non-enumerable properties won't be part of the result.

For more complex (de)serialization scenario's it is recommended to give classes a (computed) `toJSON` method, or use a serialization library like [serializr](https://github.com/mobxjs/serializr)

```javascript
const obj = mobx.observable({
    x: 1
})

const clone = mobx.toJS(obj)

console.log(mobx.isObservableObject(obj)) // true
console.log(mobx.isObservableObject(clone)) // false
```

[&laquo;details&raquo;](observable-state.md#converting-observables-back-to-vanilla-javascript-collections)

## Configuration

### `configure`

Sets global behavior settings on the active MobX instance.
Use this to change how MobX behaves as a whole.

[&laquo;details&raquo;](configuration.md)

## Collection utilities {🚀}

The Object API is an optional, generic API that enables manipulating observable maps, objects and arrays with the same API. This can be useful
in [environments without `Proxy` support](configuration.md#limitations-without-proxy-support), but are otherwise typically not needed.

### `values`

{🚀} Usage:

-   `values(map|set|array|object)`

Return all values in collection as array.

[&laquo;details&raquo;](collection-utilities.md)

### `keys`

{🚀} Usage:

-   `keys(map|set|array|object)`

Return all keys/indices in collection as array.

[&laquo;details&raquo;](collection-utilities.md)

### `entries`

{🚀} Usage:

-   `entries(map|set|array|object)`

Return a `[key, value]` pair for all entries in the collection
as an array.

[&laquo;details&raquo;](collection-utilities.md)

### `set`

{🚀} Usage:

-   `set(map|array|object, index, value)`

Update collection.

[&laquo;details&raquo;](collection-utilities.md)

### `remove`

{🚀} Usage:

-   `remove(map|array|object, index)`

Remove item from collection.

[&laquo;details&raquo;](collection-utilities.md)

### `has`

{🚀} Usage:

-   `has(map|array|object, index)`

Check for membership in collection.

[&laquo;details&raquo;](collection-utilities.md)

### `get`

{🚀} Usage:

-   `get(map|array|object, index)`

Get value from collection with key.

[&laquo;details&raquo;](collection-utilities.md)

## Introspection utilities {🚀}

The following APIs might come in handy if you want to inspect the internal state of MobX or want to build cool tools on top of MobX.

### `isObservable`

{🚀} Usage:

-   `isObservable(map | array | set | object)`

Is an object / collection made observable by MobX?

### `isObservableProp`

{🚀} Usage:

-   `isObservableProp(object, propertyName)`

Is a property observable?

### `isObservableArray`

{🚀} Usage:

-   `isObservableArray(array)`

Is value an observable array?

### `isObservableMap`

{🚀} Usage:

-   `isObservableMap(map)`

Is value an observable map?

### `isObservableSet`

{🚀} Usage:

-   `isObservableSet(set)`

Is value an observable set?

### `isObservableObject`

{🚀} Usage:

-   `isObservableObject(object)`

Is value an observable object?

### `isBoxedObservable`

{🚀} Usage:

-   `isBoxedObservable(value)`

Is value an observable box? That is, created using `observable.box`.

### `isAction`

{🚀} Usage:

-   `isAction(func)`

Returns `true` if the given function is marked as an `action`.

### `isComputed`

{🚀} Usage:

-   `isComputed(boxedComputed)`

Is this a boxed computed value? That is, created using `computed(() => expr)`?

### `isComputedProp`

{🚀} Usage:

-   `isComputedProp(object, propertyName)`

Is this a computed property?

### `trace`

Usage:

-   `trace()` (inside a reaction / observer / computed value)
-   `trace(true)` (enter the `debugger;` if this reaction is updated)
-   `trace(object, propertyName, enterDebugger?)` (trace the specified computed property)

Should be used inside a reaction / computed value. Log when value is invalidated, or set debugger breakpoint.

[&laquo;trace&raquo;](analyzing-reactivity.md)

### `spy`

{🚀} Usage:

-   `spy(eventListener)`

Registers a global spy listener that listens to all events that happen in MobX.

[&laquo;trace&raquo;](analyzing-reactivity.md#spy)

### `getDebugName`

{🚀} Usage:

-   `getDebugName(reaction)`
-   `getDebugName(array | set | map)`
-   `getDebugName(object | map, propertyName)`

Returns the (generated) friendly debug name for an observable or reaction.

[&laquo;trace&raquo;](analyzing-reactivity.md#getdebugname)

### `getDependencyTree`

{🚀} Usage:

-   `getDependencyTree(object, computedPropertyName)`

Returns a tree structure with all observables the given reaction / computation currently depends upon.

[&laquo;trace&raquo;](analyzing-reactivity.md#getdependencytree)

### `getObserverTree`

{🚀} Usage:

-   `getObserverTree(array | set | map)`
-   `getObserverTree(object | map, propertyName)`

Returns a tree structure with all reactions / computations that are observing the given observable.

[&laquo;trace&raquo;](analyzing-reactivity.md#getobservertree)

## Extending MobX {🚀}

In the rare case you want to extend MobX itself.

### `createAtom`

{🚀} Usage:

-   `createAtom(name, onBecomeObserved?, onBecomeUnobserved?)`

Utility function that can be used to create your own observable data structures and hook them up to MobX. Used internally by all observable data types.
Reports and atom that exposed to methods:

-   `reportObserved()`, to notify that this atom is "used" at should be considered part of the dependency tree of the current derivation
-   `reportChanged()`, to report to MobX that this atom has changed, and that all derivations depending on it should be invalidated

[&laquo;details&raquo;](custom-observables.md)

### `getAtom`

{🚀} Usage:

-   `getAtom(thing, property?)`

Returns the backing atom.

[&laquo;trace&raquo;](analyzing-reactivity.md#getatom)

### `transaction`

{🚀} Usage:

-   `transaction(worker: () => any)`

_Transaction is a low-level api, it is recommended to use [`action`](#action) / [`runInAction`](#runinaction) instead_

`transaction` can be used to batch a bunch of updates without notifying any observers until the end of the transaction. Like `untracked`, it is automatically applied by `action`, so usually it makes more sense to use actions than to use `transaction` directly.

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

{🚀} Usage:

-   `untracked(worker: () => any)`

_Untracked is a low-level api, it is recommended to use `reaction`, `action` or `runInAction` instead_

Untracked allows you to run a piece of code without establishing observers.
Like `transaction`, `untracked` is automatically applied by `action`, so usually it makes more sense to use actions than to use `untracked` directly.
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
