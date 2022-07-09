---
title: MobX API Reference
sidebar_label: API
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX API Reference

Functions marked with {🚀} are considered advanced, and should typically not be needed.
Consider downloading our handy cheat sheet that explains all important APIs on a single page:

<div class="cheat"><a href="https://gum.co/fSocU"><button title="Download the MobX 6 cheat sheet and sponsor the project">Get the MobX 6 cheat sheet (£5)</button></a></div>

## Core APIs

_These are the most important MobX APIs._

> Understanding [`observable`](#observable), [`computed`](#computed), [`reaction`](#reaction) and [`action`](#action) is enough to master and use MobX in your applications!

## Creating observables

_Making things observable._

### `makeObservable`

Usage: `makeObservable(target, annotations?, options?)`
<small>(<b>[further information](observable-state.md#makeobservable)</b>)</small>

Properties, entire objects, arrays, Maps and Sets can all be made observable.

### `makeAutoObservable`

Usage: `makeAutoObservable(target, overrides?, options?)`
<small>(<b>[further information](observable-state.md#makeautoobservable)</b>)</small>

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

Usage: `observable(source, overrides?, options?)` or `observable` _(annotation)_
<small>(<b>[further information](observable-state.md#observable)</b>)</small>

Clones an object and makes it observable. Source can be a plain object, array, Map or Set. By default, `observable` is applied recursively. If one of the encountered values is an object or array, that value will be passed through `observable` as well.

### `observable.object`

{🚀} Usage: `observable.object(source, overrides?, options?)`
<small>(<b>[further information](observable-state.md#observable)</b>)</small>

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

Usage: `observable.ref` _(annotation)_
<small>(<b>[further information](observable-state.md#available-annotations)</b>)</small>

Like the `observable` annotation, but only reassignments will be tracked. The assigned values themselves won't be made observable automatically. For example, use this if you intend to store immutable data in an observable field.

### `observable.shallow`

Usage: `observable.shallow` _(annotation)_
<small>(<b>[further information](observable-state.md#available-annotations)</b>)</small>

Like the `observable.ref` annotation, but for collections. Any collection assigned will be made observable, but the contents of the collection itself won't become observable.

### `observable.struct`

{🚀} Usage: `observable.struct` _(annotation)_
<small>(<b>[further information](observable-state.md#available-annotations)</b>)</small>

Like the `observable` annotation, except that any assigned value that is structurally equal to the current value will be ignored.

### `observable.deep`

{🚀} Usage: `observable.deep` _(annotation)_
<small>(<b>[further information](observable-state.md#available-annotations)</b>)</small>

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

Usage: `action(fn)` or `action` _(annotation)_
<small>(<b>[further information](actions.md)</b>)</small>

Use on functions that intend to modify the state.

### `runInAction`

{🚀} Usage: `runInAction(fn)`
<small>(<b>[further information](actions.md#runinaction)</b>)</small>

Create a one-time action that is immediately invoked.

### `flow`

Usage: `flow(fn)` or `flow` _(annotation)_
<small>(<b>[further information](actions.md#using-flow-instead-of-async--await-)</b>)</small>

MobX friendly replacement for `async` / `await` that supports cancellation.

### `flowResult`

Usage: `flowResult(flowFunctionResult)`
<small>(<b>[further information](actions.md#using-flow-instead-of-async--await-)</b>)</small>

For TypeScript users only. Utility that casts the output of the generator to a promise.
This is just a type-wise correction for the promise wrapping done by `flow`. At runtime it directly returns the inputted value.

---

## Computeds

_Computed values can be used to derive information from other observables._

### `computed`

Usage: `computed(fn, options?)` or `computed(options?)` _(annotation)_
<small>(<b>[further information](computeds.md)</b>)</small>

Creates an observable value that is derived from other observables, but won't be recomputed unless one of the underlying observables changes.

---

## React integration

_From the `mobx-react` / `mobx-react-lite` packages._

### `observer`

Usage: `observer(component)`
<small>(<b>[further information](react-integration.md)</b>)</small>

A higher order component you can use to make a functional or class based React component re-render when observables change.

### `Observer`

Usage: `<Observer>{() => rendering}</Observer>`
<small>(<b>[further information](react-integration.md#callback-components-might-require-observer)</b>)</small>

Renders the given render function, and automatically re-renders it once one of the observables used in the render function changes.

### `useLocalObservable`

Usage: `useLocalObservable(() => source, annotations?)`
<small>(<b>[further information](react-integration.md#using-local-observable-state-in-observer-components)</b>)</small>

Creates a new observable object using `makeObservable`, and keeps it around in the component for the entire life-cycle of the component.

---

## Reactions

_The goal of reactions is to model side effects that happen automatically._

### `autorun`

Usage: `autorun(() => effect, options?)`
<small>(<b>[further information](reactions.md#autorun)</b>)</small>

Reruns a function every time anything it observes changes.

### `reaction`

Usage: `reaction(() => data, data => effect, options?)`
<small>(<b>[further information](reactions.md#reaction)</b>)</small>

Reruns a side effect when any selected data changes.

### `when`

Usage: `when(() => condition, () => effect, options?)` or `await when(() => condition, options?)`
<small>(<b>[further information](reactions.md#when)</b>)</small>

Executes a side effect once when a observable condition becomes true.

---

## Utilities

_Utilities that might make working with observable objects or computed values more convenient. Less trivial utilities can also be found in the [mobx-utils](https://github.com/mobxjs/mobx-utils) package._

### `onReactionError`

{🚀} Usage: `onReactionError(handler: (error: any, derivation) => void)`

Attaches a global error listener, which is invoked for every error that is thrown from a _reaction_. This can be used for monitoring or test purposes.

### `intercept`

{🚀} Usage: `intercept(propertyName|array|object|Set|Map, listener)`
<small>(<b>[further information](intercept-and-observe.md#intercept)</b>)</small>

Intercepts changes before they are applied to an observable API. Returns a disposer function that stops the interception.

### `observe`

{🚀} Usage: `observe(propertyName|array|object|Set|Map, listener)`
<small>(<b>[further information](intercept-and-observe.md#observe)</b>)</small>

Low-level API that can be used to observe a single observable value. Returns a disposer function that stops the interception.

### `onBecomeObserved`

{🚀} Usage: `onBecomeObserved(observable, property?, listener: () => void)`
<small>(<b>[further information](lazy-observables.md)</b>)</small>

Hook for when something becomes observed.

### `onBecomeUnobserved`

{🚀} Usage: `onBecomeUnobserved(observable, property?, listener: () => void)`
<small>(<b>[further information](lazy-observables.md)</b>)</small>

Hook for when something stops being observed.

### `toJS`

Usage: `toJS(value)`
<small>(<b>[further information](observable-state.md#converting-observables-back-to-vanilla-javascript-collections)</b>)</small>

Recursively converts an observable object to a JavaScript _object_. Supports observable arrays, objects, Maps and primitives.

It does NOT recurse into non-observables, these are left as they are, even if they contain observables.
Computed and other non-enumerable properties are completely ignored and won't be returned.

For more complex (de)serialization scenarios, it is recommended to give classes a (computed) `toJSON` method, or use a serialization library like [serializr](https://github.com/mobxjs/serializr).

```javascript
const obj = mobx.observable({
    x: 1
})

const clone = mobx.toJS(obj)

console.log(mobx.isObservableObject(obj)) // true
console.log(mobx.isObservableObject(clone)) // false
```

---

## Configuration

_Fine-tuning your MobX instance._

### `configure`

Usage: sets global behavior settings on the active MobX instance.
<small>(<b>[further information](configuration.md)</b>)</small>
Use it to change how MobX behaves as a whole.

---

## Collection utilities {🚀}

_They enable manipulating observable arrays, objects and Maps with the same generic API. This can be useful in [environments without `Proxy` support](configuration.md#limitations-without-proxy-support), but is otherwise typically not needed._

### `values`

{🚀} Usage: `values(array|object|Set|Map)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Returns all values in the collection as an array.

### `keys`

{🚀} Usage: `keys(array|object|Set|Map)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Returns all keys / indices in the collection as an array.

### `entries`

{🚀} Usage: `entries(array|object|Set|Map)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Returns a `[key, value]` pair of every entry in the collection as an array.

### `set`

{🚀} Usage: `set(array|object|Map, key, value)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Updates the collection.

### `remove`

{🚀} Usage: `remove(array|object|Map, key)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Removes item from the collection.

### `has`

{🚀} Usage: `has(array|object|Map, key)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Checks for membership in the collection.

### `get`

{🚀} Usage: `get(array|object|Map, key)`
<small>(<b>[further information](collection-utilities.md)</b>)</small>

Gets value from the collection with key.

---

## Introspection utilities {🚀}

_Utilities that might come in handy if you want to inspect the internal state of MobX, or want to build cool tools on top of MobX._

### `isObservable`

{🚀} Usage: `isObservable(array|object|Set|Map)`

Is the object / collection made observable by MobX?

### `isObservableProp`

{🚀} Usage: `isObservableProp(object, propertyName)`

Is the property observable?

### `isObservableArray`

{🚀} Usage: `isObservableArray(array)`

Is the value an observable array?

### `isObservableObject`

{🚀} Usage: `isObservableObject(object)`

Is the value an observable object?

### `isObservableSet`

{🚀} Usage: `isObservableSet(set)`

Is the value an observable Set?

### `isObservableMap`

{🚀} Usage: `isObservableMap(map)`

Is the value an observable Map?

### `isBoxedObservable`

{🚀} Usage: `isBoxedObservable(value)`

Is the value an observable box, created using `observable.box`?

### `isAction`

{🚀} Usage: `isAction(func)`

Is the function marked as an `action`?

### `isComputed`

{🚀} Usage: `isComputed(boxedComputed)`

Is this a boxed computed value, created using `computed(() => expr)`?

### `isComputedProp`

{🚀} Usage: `isComputedProp(object, propertyName)`

Is this a computed property?

### `trace`

{🚀} Usage: `trace()`, `trace(true)` _(enter debugger)_ or `trace(object, propertyName, enterDebugger?)`
<small>(<b>[further information](analyzing-reactivity.md)</b>)</small>

Should be used inside an observer, reaction or computed value. Logs when the value is invalidated, or sets the debugger breakpoint if called with _true_.

### `spy`

{🚀} Usage: `spy(eventListener)`
<small>(<b>[further information](analyzing-reactivity.md#spy)</b>)</small>

Registers a global spy listener that listens to all events that happen in MobX.

### `getDebugName`

{🚀} Usage: `getDebugName(reaction|array|Set|Map)` or `getDebugName(object|Map, propertyName)`
<small>(<b>[further information](analyzing-reactivity.md#getdebugname)</b>)</small>

Returns the (generated) friendly debug name for an observable or reaction.

### `getDependencyTree`

{🚀} Usage: `getDependencyTree(object, computedPropertyName)`
<small>(<b>[further information](analyzing-reactivity.md#getdependencytree)</b>)</small>

Returns a tree structure with all observables the given reaction / computation currently depends upon.

### `getObserverTree`

{🚀} Usage: `getObserverTree(array|Set|Map)` or `getObserverTree(object|Map, propertyName)`
<small>(<b>[further information](analyzing-reactivity.md#getobservertree)</b>)</small>

Returns a tree structure with all reactions / computations that are observing the given observable.

---

## Extending MobX {🚀}

_In the rare case you want to extend MobX itself._

### `createAtom`

{🚀} Usage: `createAtom(name, onBecomeObserved?, onBecomeUnobserved?)`
<small>(<b>[further information](custom-observables.md)</b>)</small>

Creates your own observable data structure and hooks it up to MobX. Used internally by all observable data types. Atom exposes two _report_ methods to notify MobX with when:

-   `reportObserved()`: the atom has become observed, and should be considered part of the dependency tree of the current derivation.
-   `reportChanged()`: the atom has changed, and all derivations depending on it should be invalidated.

### `getAtom`

{🚀} Usage: `getAtom(thing, property?)`
<small>(<b>[further information](analyzing-reactivity.md#getatom)</b>)</small>

Returns the backing atom.

### `transaction`

{🚀} Usage: `transaction(worker: () => any)`

_Transaction is a low-level API. It is recommended to use [`action`](#action) or [`runInAction`](#runinaction) instead._

Used to batch a bunch of updates without running any reactions until the end of the transaction. Like [`untracked`](#untracked), it is automatically applied by `action`, so usually it makes more sense to use actions than to use `transaction` directly.

It takes a single, parameterless `worker` function as an argument, and returns any value that was returned by it.
Note that `transaction` runs completely synchronously and can be nested. Only after completing the outermost `transaction`, the pending reactions will be run.

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

{🚀} Usage: `untracked(worker: () => any)`

_Untracked is a low-level API. It is recommended to use [`reaction`](#reaction), [`action`](#action) or [`runInAction`](#runinaction) instead._

Runs a piece of code without establishing observers. Like `transaction`, `untracked` is automatically applied by `action`, so usually it makes more sense to use actions than to use `untracked` directly.

```javascript
const person = observable({
    firstName: "Michel",
    lastName: "Weststrate"
})

autorun(() => {
    console.log(
        person.lastName,
        ",",
        // This untracked block will return the person's
        // firstName without establishing a dependency.
        untracked(() => person.firstName)
    )
})
// Prints: 'Weststrate, Michel'

person.firstName = "G.K."
// Doesn't print!

person.lastName = "Chesterton"
// Prints: 'Chesterton, G.K.'
```
