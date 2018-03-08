# MobX Api Reference

**Applies to MobX 4 and higher**

- Using Mobx 3? Use this [migration guide](https://github.com/mobxjs/mobx/wiki/Migrating-from-mobx-3-to-mobx-4) to switch gears.
- For MobX 2, the old documentation is still available on [github](https://github.com/mobxjs/mobx/blob/7c9e7c86e0c6ead141bb0539d33143d0e1f576dd/docs/refguide/api.md).

# Core API

_These are the most important MobX API's._ 

> Understanding `observable`, `computed`, `reaction` and `action` is enough
 to master MobX and use it in your applications!

## Creating observables


### `observable(value)`
Usage:
* `observable(value)`
* `@observable classProperty = value`

Observable values can be JS primitives, references, plain objects, class instances, arrays and maps.

**Note:** `observable(value)` is a convenience API that will succeed only if it can be made into
 an observable data structure (_Array_, _Map_, or _observable-object_). For all other values, no conversion will be performed. 

You can also directly create the desired observable type, see below.

The following conversion rules are applied, but can be fine-tuned by using [*decorators*](#decorators). See below.

1. If *value* is an instance of an [ES6 Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map): a new [Observable Map](map.md) will be returned. Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
1. If *value* is an array, a new [Observable Array](array.md) will be returned.
1. If *value* is an object *without* prototype or its prototype is `Object.prototype`, the object will be cloned and all its current properties will be made observable. See [Observable Object](object.md)
1. If *value* is an object *with* a prototype, a JavaScript primitive or function, there will be no change made to the value. If you do need a [Boxed Observable](boxed.md), call `observable.box(value)` explicitly. MobX will not make objects with a prototype automatically observable; as that is the responsibility of its constructor function. Use `extendObservable` in the constructor, or `@observable` in its class definition instead.

These rules might seem complicated at first sight, but you will notice that in practice they are very intuitive to work with.

**Some notes:**

* To create dynamically keyed objects, always use maps! Only initially existing properties on an object will be made observable, although new ones can be added using `extendObservable`.
* To use the `@observable` decorator, make sure that [decorators are enabled](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) in your transpiler (babel or typescript).
* By default making a data structure observable is *infective*; that means that `observable` is applied automatically to any value that is contained by the data structure, or will be contained by the data structure in the future. This behavior can be changed by using [*decorators*](#decorators).

[&laquo;`observable`&raquo;](observable.md)  &mdash;  [&laquo;`@observable`&raquo;](observable-decorator.md)

### `@observable property =  value`

`observable` can also be used as property decorator. It requires [decorators to be enabled](../best/decorators.md) and is syntactic
sugar for `extendObservable(this, { property: value })`.

[&laquo;`details`&raquo;](observable-decorator.md)

### `observable.box(value)` & `observable.box(value, {deep: false})`
Creates an observable _box_ that stores an observable reference to a value. Use `get()` to get the current value of the box, and `set()` to update it.
This is the foundation on which all other observables are built, but in practice you will use it rarely.

Normal boxes will automatically try to turn any new value into an observable if it isn't already. Use `{deep: false}` option to disable this behavior.

[&laquo;`details`&raquo;](boxed.md)

### `observable.object(value)` & `observable.object(value, decorators, {deep: false})`

Creates a clone of the provided object and makes all its properties observable.
By default any values in those properties will be made observable as well, but when using `{deep: false}` only the properties will be made into observable
references, leaving the values untouched. (This holds also for any values assigned in the future).

The second argument in `observable.object()` can be used to fine tune the observability with [`decorators`](#decorators).

[&laquo;`details`&raquo;](object.md)the

### `observable.array(value)` & `observable.array(value, {deep: false})`

Creates a new observable array based on the provided value. 

Use the `{deep: false}` option if the values in the array should not be turned into observables.

[&laquo;`details`&raquo;](array.md)

### `observable.map(value)` & `observable.map(value, {deep: false})`

Creates a new observable map based on the provided value. Use `{deep: false}` if the values in the map should not be turned into observables.

Use `map` whenever you want to create a dynamically keyed collections and the addition / removal of keys needs to be observed.
Since this uses the full-blown _ES6 Map_ internally, you are free to use any type for the key and _not limited_ to string keys.

[&laquo;`details`&raquo;](map.md)

### `extendObservable` & `extendObservable(target, props, decorators?, options?)`
Usage: `extendObservable(target, ...propertyMaps)`. 

For each key/value pair in each `propertyMap` a (new) observable property will be introduced on the target object.
This can be used in constructor functions to introduce observable properties without using decorators.
If a value of the `propertyMap` is a getter function, a *computed* property will be introduced.

Use `extendObservable(target, props, decorators?, {deep: false})` if the new properties should not be infective (that is; newly assigned values should not be turned into observables automatically).
Note that `extendObservable` enhances existing objects, unlike `observable.object` which creates a new object.

[&laquo;details&raquo;](extend-observable.md)

### Decorators

Use decorators to fine tune the observability of properties defined via `observable`, `extendObservable` and `observable.object`. They can also control the auto-conversion rules for specific properties.

The following decorators are available:

* **`observable.deep`**: This is the default modifier, used by any observable. It converts any assigned, non-primitive value into an observable if it isn't one yet.
* **`observable.ref`**: Disables automatic observable conversion, just creates an observable reference instead.
* **`observable.shallow`**: Can only be used in combination with collections. Turns any assigned collection into an collection, which is shallowly observable (instead of deep). In other words; the values inside the collection won't become observables automatically.
* **`computed`**: Creates a derived property, see [`computed`](computed-decorator.md)
* **`action`**: Creates an action, see [`action`](action.md)

You can apply these decorators using the _@decorator_ syntax:

```javascript
import {observable, action} from 'mobx';

class TaskStore {
    @observable.shallow tasks = []
    @action addTask(task) { /* ... */ }
}
```

Or by passing in property decorators via `observable.object` / `observable.extendObservable`.
Note that decorators always 'stick' to the property. So they will remain in effect even if a new value is assigned.

```javascript
import {observable, action} from 'mobx';

const taskStore = observable({
    tasks: [],
    addTask(task) { /* ... */ }
}, {
    tasks: observable.shallow,
    addTask: action
})
```

[&laquo;details&raquo;](modifiers.md)


## Computed values

Usage:
* `computed(() => expression)`
* `computed(() => expression, (newValue) => void)`
* `computed(() => expression, options)`
* `@computed get classProperty() { return expression; }`
* `@computed.struct get classProperty() { return expression; }`
* `@computed.equals(comparisonMethod) get classProperty() { return expression; }`


Creates a computed property. The `expression` should not have side effects but return a value.
The expression will automatically be re-evaluated if any observables it uses changes, but only if it is in use by some *reaction*.

Comparison method can be used to override the default detection on when something is changed and should be of value `(value, value) => boolean`. Built-in comparers are: `comparer.identity`, `comparer.default`, `comparer.structural`

[&laquo;details&raquo;](computed-decorator.md)

## Actions

Any application has actions. Actions are anything that modify the state.

With MobX you can make it explicit in your code where your actions live by marking them.
Actions helps you to structure your code better.
It is advised to use them on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.
Note: using `action` is mandatory when *strict mode* is enabled, see `useStrict`.
[&laquo;details&raquo;](action.md)

Usage:
* `action(fn)`
* `action(name, fn)`
* `@action classMethod`
* `@action(name) classMethod`
* `@action boundClassMethod = (args) => { body }`
* `@action(name) boundClassMethod = (args) => { body }`

For one-time-actions `runInAction(name?, fn, scope?)` can be used, which is sugar for `action(name, fn, scope)()`.

## Reactions & Derivations

*Computed values* are **values** that react automatically to state changes.
*Reactions* are **side effects** that react automatically to state changes.
Reactions _can_ be used to ensure that a certain side effect (mainly I/O) is automatically executed when relevant state changes, like logging, network requests etc.
The most commonly used reaction is the `observer` decorator for React components (see below).

### `observer`
Can be used as higher order component around a React component.
The component will then automatically re-render if any of the observables used in the `render` function of the component has changed.
Note that `observer` is provided by the `"mobx-react"` package and not by `"mobx"` itself.
[&laquo;details&raquo;](observer-component.md)

Usage:
* `observer(React.createClass({ ... }))`
* `observer((props, context) => ReactElement)`
* `observer(class MyComponent extends React.Component { ... })`
* `@observer class MyComponent extends React.Component { ... }`


### `autorun`
Usage: `autorun(debugname?, () => { sideEffect })`. Autorun runs the provided `sideEffect` and tracks which observable state is accessed while running the side effect.
Whenever one of the used observables is changed in the future, the same sideEffect will be run again.
Returns a disposer function to cancel the side effect. [&laquo;details&raquo;](autorun.md)

### `when`
Usage: `when(debugname?, () => condition, () => { sideEffect })`.
The condition expression will react automatically to any observables it uses.
As soon as the expression returns true the sideEffect function will be invoked, but only once.
`when` returns a disposer to prematurely cancel the whole thing. [&laquo;details&raquo;](when.md)

### `autorunAsync`
Usage: `autorunAsync(debugname?, () => { sideEffect }, delay)`. Similar to `autorun`, but the sideEffect will be delayed and debounced with the given `delay`.
[&laquo;details&raquo;](autorun-async.md)

### `reaction`
Usage: `reaction(debugname?, () => data, data => { sideEffect }, fireImmediately = false, delay = 0)`.
A variation on `autorun` that gives more fine-grained control on which observables that will be tracked.
It takes two function, the first one is tracked and returns data that is used as input for the second one, the side effect.
Unlike `autorun` the side effect won't be run initially, and any observables that are accessed while executing the side effect will not be tracked.
The side effect can be debounced, just like `autorunAsync`. [&laquo;details&raquo;](reaction.md)

### `expr`
Usage: `expr(() => someExpression)`. Just a shorthand for `computed(() => someExpression).get()`.
`expr` is useful in some rare cases to optimize another computed function or reaction.
In general it is simpler and better to just split the function in multiple smaller computed's to achieve the same effect.
[&laquo;details&raquo;](expr.md)

### `onReactionError`

Usage: `onReactionError(handler: (error: any, derivation) => void)`

This method attaches a global error listener, which is invoked for every error that is thrown from a _reaction_.
This can be used for monitoring or test purposes.

------

# Utilities

_Here are some utilities that might make working with observable objects or computed values more convenient.
More, less trivial utilities can be found in the * [mobx-utils](https://github.com/mobxjs/mobx-utils) package._

### `Provider` (`mobx-react` package)

Can be used to pass stores to child components using React's context mechanism. See the [`mobx-react` docs](https://github.com/mobxjs/mobx-react#provider-experimental).

### `inject` (`mobx-react` package)

Higher order component and counterpart of `Provider`. Can be used to pick stores from React's context and pass it as props to the target component. Usage:
* `inject("store1", "store2")(observer(MyComponent))`
* `@inject("store1", "store2") @observer MyComponent`
* `@inject((stores, props, context) => props) @observer MyComponent`
* `@observer(["store1", "store2"]) MyComponent` is a shorthand for the the `@inject() @observer` combo.

### `toJS`
Usage: `toJS(observableDataStructure)`. Converts observable data structures back to plain javascript objects, ignoring computed values. [&laquo;details&raquo;](tojson.md)

### `isObservable`
Usage: `isObservable(thing, property?)`. Returns true if the given thing, or the `property` of the given thing is observable.
Works for all observables, computed values and disposer functions of reactions. [&laquo;details&raquo;](is-observable)

### `isObservableObject|Array|Map` and `isBoxedObservable`
Usage: `isObservableObject(thing)`, `isObservableArray(thing)`, `isObservableMap(thing)`, `isBoxedObservable(thing)`. Returns `true` if.., well, do the math.

### `isArrayLike`
Usage: `isArrayLike(thing)`. Returns `true` if the given thing is either a true JS-array or an observable (MobX-)array.
This is intended as convenience/shorthand.
Note that observable arrays can be `.slice()`d to turn them into true JS-arrays.

### `isAction`
Usage: `isAction(func)`. Returns true if the given function is wrapped / decorated with `action`.

### `isComputed`
Usage: `isComputed(thing, property?)`. Returns true if the given thing is a boxed computed value, or if the designated property is a computed value.

### `intercept`
Usage: `intercept(object, property?, interceptor)`.
Api that can be used to intercept changes before they are applied to an observable api. Useful for validation, normalization or cancellation.
[&laquo;details&raquo;](observe.md)

### `observe`
Usage: `observe(object, property?, listener, fireImmediately = false)`
Low-level api that can be used to observe a single observable value.
[&laquo;details&raquo;](observe.md)

### `decorate`
Usage: TODO
TODO

### `onBecomeObserved` and `onBecomeUnobserved`
Usage: TODO
TODO

### `configure`
Usage: `configure({ enforceActions: boolean, isolateGlobalState: boolean })`.

- **`enforceActions`**: Enables / disables strict mode *globally*.
In strict mode, it is not allowed to change any state outside of an [`action`](action.md).
See also `allowStateChanges`.
- **`isolateGlobalState`**: Isolates the global state of MobX, when there are multiple instances of MobX in the same environment. This is useful when you have an encapsulated library that is using MobX, living in the same page as the app that is using MobX. The reactivty inside the library will remain self-contained when you call `configure({isolateGlobalState: true})` inside the library. Additionally, MobX won't throw an error that there are multiple instances in the global scope. 





# Development utilities

_The following api's might come in handy if you want to build cool tools on top of MobX or if you want to inspect the internal state of MobX_

### `"mobx-react-devtools"` package
The mobx-react-devtools is a powerful package that helps you to investigate the performance and dependencies of your react components.
Also has a powerful logger utility based on `spy`. [&laquo;details&raquo;](../best/devtools.md)

### `trace`
Usage:
* `trace(enterDebugger?)`
* `trace(Reaction object / ComputedValue object / disposer function, enterDebugger?)`
* `trace(object, computedValuePropertyName, enterDebugger?)`

`trace` is a small utility that you can use inside a computed value or reaction.
If it is enabled, it will start logging when the value is being invalidated, and why.
If `enterDebugger` is set to true, and developer tools are enabled, the javascript engine
will break on the point where it is triggered.

[&laquo;trace&raquo;](../best/trace.md)

### `spy`
Usage: `spy(listener)`.
Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to *all* observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the `mobx-react-devtools`.
[&laquo;details&raquo;](spy.md)

### `getAtom`
Usage: `getAtom(thing, property?)`.
Returns the backing *Atom* of a given observable object, property, reaction etc.

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
* `trackComponents()`: enables the tracking of `observer` based React components
* `renderReporter.on(callback)`: callback will be invoked on each rendering of an `observer` enabled React component, with timing information etc
* `componentByNodeRegistery`: ES6 WeakMap that maps from DOMNode to a `observer` based React component instance

# Internal functions

_The following methods are all used internally by MobX, and might come in handy in rare cases. But usually MobX offers more declarative alternatives to tackle the same problem. They might come in handy though if you try to extend MobX_

### `transaction`
Usage: `transaction(() => { block })`.
Deprecated, use actions or `runInAction` instead.
Low-level api that can be used to batch state changes.
State changes made inside the block won't cause any computations or reactions to run until the end of the block is reached.
Nonetheless inspecting a computed value inside a transaction block will still return a consistent value.
It is recommended to use `action` instead, which uses `transaction` internally.
[&laquo;details&raquo;](transaction.md)

### `untracked`
Usage: `untracked(() => { block })`.
Low-level api that might be useful inside reactions and computations.
Any observables accessed in the `block` won't cause the reaction / computations to be recomputed automatically.
However it is recommended to use `action` instead, which uses `untracked` internally.
[&laquo;details&raquo;](untracked.md)

### `createAtom`
Utility function that can be used to create your own observable data structures and hook them up to MobX.
Used internally by all observable data types.
[&laquo;details&raquo;](extending.md)

### `Reaction`
Utility class that can be used to create your own reactions and hook them up to MobX.
Used internally by `autorun`, `reaction` (function) etc.
[&laquo;details&raquo;](extending.md)

### `allowStateChanges`
Usage: `allowStateChanges(allowStateChanges, () => { block })`.
Can be used to (dis)allow state changes in a certain function.
Used internally by `action` to allow changes, and by `computed` and `observer` to disallow state changes.

### `resetGlobalState`
Usage: `resetGlobalState()`.
Resets MobX internal global state. MobX by defaults fails fast if an exception occurs inside a computation or reaction and refuses to run them again.
This function resets MobX to the zero state. Existing `spy` listeners and the current value of strictMode will be preserved though.
