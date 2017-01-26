# MobX Api Reference

Applies to MobX 3 and higher. For MobX 2, the old documentation is still available on [github](https://github.com/mobxjs/mobx/blob/7c9e7c86e0c6ead141bb0539d33143d0e1f576dd/docs/refguide/api.md)

# Core API

_The most important MobX api's. Understanding `observable`, `computed`, `reactions` and `actions` is enough to master MobX and use it in your applications!_

## Creating observables


### `observable(value)`
Usage:
* `observable(value)`
* `@observable classProperty = value`

Observable values can be JS primitives, references, plain objects, class instances, arrays and maps.
`observable(value)` is a convenience overload, that always tries to create the best matching observable types.
You can also directly create the desired observable type, see below.

The following conversion rules are applied, but can be fine-tuned by using *modifiers*. See below.

1. If *value* is an wrapped is an instance of an [ES6 Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map): a new [Observable Map](map.md) will be returned. Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
1. If *value* is an array, a new [Observable Array](array.md) will be returned.
1. If *value* is an object *without* prototype, the object will be cloned and all its current properties will be made observable. See [Observable Object](object.md)
1. If *value* is an object *with* a prototype, a JavaScript primitive or function, a [Boxed Observable](boxed.md) will be returned. MobX will not make objects with a prototype automatically observable; as that is the responsibility of its constructor function. Use `extendObservable` in the constructor, or `@observable` in its class definition instead.

These rules might seem complicated at first sight, but you will notice that in practice they are very intuitive to work with.
Some notes:
* To create dynamically keyed objects always use maps! Only initially existing properties on an object will be made observable, although new ones can be added using `extendObservable`.
* To use the `@observable` decorator, make sure that [decorators are enabled](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) in your transpiler (babel or typescript).
* By default making a data structure observable is *infective*; that means that `observable` is applied automatically to any value that is contained by the data structure, or will be contained by the data structure in the future. This behavior can be changed by using *modifiers* or *shallow*.

[&laquo;`observable`&raquo;](observable.md)  &mdash;  [&laquo;`@observable`&raquo;](observable-decorator.md)

### `@observable property =  value`

`observable` can also be used as property decorator. It requires [decorators to be enabled](../best/decorators.md) and is syntactic
sugar for `extendObservable(this, { property: value })`.

[&laquo;`details`&raquo;](observable-decorator.md)

### `observable.box(value)` & `observable.shallowBox(value)`

Creates an observable _box_ that stores an observable reference to a value. Use `get()` to get the current value of the box, and `set()` to update it.
This is the foundation on which all other observables are built, but in practice you will use it rarely.
Normal boxes will automatically try to turn any new value into an observable if it isn't already. Use `shallowBox` to disable this behavior.

[&laquo;`details`&raquo;](boxed.md)

### `observable.object(value)` & `observable.shallowObject(value)`

Creates a clone of the provided object and makes all its properties observable.
By default any values in those properties will be made observable as well, but when using `shallowObject` only the properties will be made into observable
references, but the values will be untouched. (This holds also for any values assigned in the future)

[&laquo;`details`&raquo;](object.md)

### `observable.array(value)` & `observable.shallowArray(value)`

Creates a new observable array based on the provided value. Use `shallowArray` if the values in the array should not be turned into observables.

[&laquo;`details`&raquo;](array.md)

### `observable.map(value)` & `observable.shallowMap(value)`

Creates a new observable map based on the provided value. Use `shallowMap` if the values in the array should not be turned into observables.
Use `map` whenever you want to create a dynamically keyed collections and the addition / removal of keys needs to be observed.
Note that only string keys are supported.

[&laquo;`details`&raquo;](map.md)

### `extendObservable` & `extendShallowObservable`
Usage: `extendObservable(target, ...propertyMaps)`. For each key/value pair in each `propertyMap` a (new) observable property will be introduced on the target object.
This can be used in constructor functions to introduce observable properties without using decorators.
If a value of the `propertyMap` is a getter function, a *computed* property will be introduced.

Use `extendShallowObservable` if the new properties should not be infective (that is; newly assigned values should not be turned into observables automatically).
Note that `extendObservable` enhances existing objects, unlike `observable.object` which creates a new object.

[&laquo;details&raquo;](extend-observable.md)

### Modifiers

Modifiers can be used decorator or in combination with `extendObservable` and `observable.object` to change the autoconversion rules for specific properties.

The following modifiers are available:

* `observable.deep`: This is the default modifier, used by any observable. It converts any assigned, non-primitive value into an observable if it isn't one yet.
* `observable.ref`: Disables automatic observable conversion, just creates an observable reference instead.
* `observable.shallow`: Can only used in combination with collections. Turns any assigned collection into an collection, which is shallowly observable (instead of deep). In other words; the values inside the collection won't become observables automatically.
* `computed`: Creates a derived property, see [`computed`](computed-decorator.md)
* `action`: Creates an action, see [`action`](action.md)

Modifiers can be used as decorator:

```javascript
class TaskStore {
    @observable.shallow tasks = []
}
```

Or as property modifier in combination with `observable.object` / `observable.extendObservable`.
Note that modifiers always 'stick' to the property. So they will remain in effect even if a new value is assigned.

```javascript
const taskStore = observable({
    tasks: observable.shallow([])
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

Creates a computed property. The `expression` should not have side effects but return a value.
The expression will automatically be re-evaluated if any observables it uses changes, but only if it is in use by some *reaction*.

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
* `@observer class MyComponent extends React.Component { ... })`


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

Usage: `extras.onReactionError(handler: (error: any, derivation) => void)`

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

### `isObservableObject|Array|Map`
Usage: `isObservableObject(thing)`, `isObservableArray(thing)`, `isObservableMap(thing)`. Returns `true` if.., well, do the math.

### `isArrayLike`
Usage: `isArrayLike(thing)`. Returns `true` if the given thing is either a true JS-array or an observable (MobX-)array.
This is intended as convenience/shorthand.
Note that observable arrays can be `.slice()`d to turn them into true JS-arrays.

### `isAction`
Usage: `isAction(func)`. Returns true if the given function is wrapped / decorated with `action`.

### `isComputed`
Usage: `isComputed(thing, property?)`. Returns true if the giving thing is a boxed computed value, or if the designated property is a computed value.

### `createTransformer`
Usage: `createTransformer(transformation: A => B, onCleanup?): A = B`.
Can be used to make functions that transforms one value into another value reactive and memoized.
It behaves similar to computed and can be used for advanced patterns like very efficient array maps, map reduce or computed values that are not part of an object.
[&laquo;details&raquo;](create-transformer.md)

### `intercept`
Usage: `intercept(object, property?, interceptor)`.
Api that can be used to intercept changes before they are applied to an observable api. Useful for validation, normalization or cancellation.
[&laquo;details&raquo;](observe.md)

### `observe`
Usage: `observe(object, property?, listener, fireImmediately = false)`
Low-level api that can be used to observe a single observable value.
[&laquo;details&raquo;](observe.md)

### `useStrict`
Usage: `useStrict(boolean)`.
Enables / disables strict mode *globally*.
In strict mode, it is not allowed to change any state outside of an [`action`](action.md).
See also `extras.allowStateChanges`.




# Development utilities

_The following api's might come in handy if you want to build cool tools on top of MobX or if you want to inspect the internal state of MobX_

### `"mobx-react-devtools"` package
The mobx-react-devtools is a powerful package that helps you to investigate the performance and dependencies of your react components.
Also has a powerful logger utility based on `spy`. [&laquo;details&raquo;](../best/devtools.md)

### `spy`
Usage: `spy(listener)`.
Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to *all* observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the `mobx-react-devtools`.
[&laquo;details&raquo;](spy.md)

### `whyRun`
Usage:
* `whyRun()`
* `whyRun(Reaction object / ComputedValue object / disposer function)`
* `whyRun(object, "computed property name")`

`whyRun` is a small utility that can be used inside computed value or reaction (`autorun`, `reaction` or the `render` method of an `observer` React component)
and prints why the derivation is currently running, and under which circumstances it will run again.
This should help to get a deeper understanding when and why MobX runs stuff, and prevent some beginner mistakes.


### `extras.getAtom`
Usage: `getAtom(thing, property?)`.
Returns the backing *Atom* of a given observable object, property, reaction etc.

### `extras.getDebugName`
Usage: `getDebugName(thing, property?)`
Returns a (generated) friendly debug name of an observable object, property, reaction etc. Used by for example the `mobx-react-devtools`.

### `extras.getDependencyTree`
Usage: `getDependencyTree(thing, property?)`.
Returns a tree structure with all observables the given reaction / computation currently depends upon.

### `extras.getObserverTree`
Usage: `getObserverTree(thing, property?)`.
Returns a tree structure with all reactions / computations that are observing the given observable.

### `extras.isSpyEnabled`
Usage: `isSpyEnabled()`. Returns true if at least one spy is active

### `extras.spyReport`
Usage: `spyReport({ type: "your type", &laquo;details&raquo; data})`. Emit your own custom spy event.

### `extras.spyReportStart`
Usage: `spyReportStart({ type: "your type", &laquo;details&raquo; data})`. Emit your own custom spy event. Will start a new nested spy event group which should be closed using `spyReportEnd()`

### `extras.spyReportEnd`
Usage: `spyReportEnd()`. Ends the current spy group that was started with `extras.spyReportStart`.

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
Any observables accessed in the `block` won't cause the reaction / compuations to be recomputed automatically.
However it is recommended to use `action` instead, which uses `untracked` internally.
[&laquo;details&raquo;](untracked.md)

### `Atom`
Utility class that can be used to create your own observable data structures and hook them up to MobX.
Used internally by all observable data types.
[&laquo;details&raquo;](extending.md)

### `Reaction`
Utility class that can be used to create your own reactions and hook them up to MobX.
Used internally by `autorun`, `reaction` (function) etc.
[&laquo;details&raquo;](extending.md)

### `extras.allowStateChanges`
Usage: `allowStateChanges(allowStateChanges, () => { block })`.
Can be used to (dis)allow state changes in a certain function.
Used internally by `action` to allow changes, and by `computed` and `observer` to disallow state changes.

### `extras.resetGlobalState`
Usage: `resetGlobalState()`.
Resets MobX internal global state. MobX by defaults fails fast if an exception occurs inside a computation or reaction and refuses to run them again.
This function resets MobX to the zero state. Existing `spy` listeners and the current value of strictMode will be preserved though.
