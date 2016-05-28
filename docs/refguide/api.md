# MobX Api Reference

# Core API

_The most important MobX api's. Understanding `observable`, `computed`, `reactions` and `actions` is enough to master MobX and use it in your applications!_

## Creating observables

### `observable`
Usage: 
* `observable(value)`
* `@observable classProperty = value` 

Observable values can be JS primitives, references, plain objects, class instances, arrays and maps.
The following conversion rules are applied, but can be fine-tuned by using *modifiers*. See below.

1. If *value* is wrapped in the *modifier* `asMap`: a new [Observable Map](map.md) will be returned. Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
1. If *value* is an array, a new [Observable Array](array.md) will be returned.
1. If *value* is an object *without* prototype, all its current properties will be made observable. See [Observable Object](object.md)
1. If *value* is an object *with* a prototype, a JavaScript primitive or function, a [Boxed Observable](boxed.md) will be returned. MobX will not make objects with a prototype automatically observable; as that is the responsibility of it's constructor function. Use `extendObservable` in the constructor, or `@observable` in it's class definition instead.  

These rules might seem complicated at first sight, but you will notice that in practice they are very intuitive to work with.
Some notes:
* To create dynamically keyed objects use the `asMap` modifier! Only initially existing properties on an object will be made observable, although new ones can be added using `extendObservable`.
* To use the `@observable` decorator, make sure that [decorators are enabled](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) in your transpiler (babel or typescript). 
* By default making a data structure observable is *infective*; that means that `observable` is applied automatically to any value that is contained by the data structure, or will be contained by the data structure in the future. This behavior can be changed by using *modifiers*.

[&laquo;`observable`&raquo;](observable.md)  &mdash;  [&laquo;`@observable`&raquo;](observable-decorator.md)

### `extendObservable`
Usage: `extendObservable(target, propertyMap)`. For each key/value pair in `propertyMap` a (new) observable property will be introduced on the target object.
This can be used in constructor functions to introduce observable properties without using decorators.
If a value of the `propertyMap` is an argumentless function, a *computed* property will be introduced. 
[&laquo;details&raquo;](extend-observable.md) 

## Computed values

Usage:
* `computed(() => expression)`
* `@computed get classProperty() { return expression; }`

Creates a computed property. The `expression` should not have side effects but return a value.
The expression will automatically be re-evaluted if any observables it uses changes, but only if it is in use by some *reaction*.
[&laquo;details&raquo;](computed-decorator.md)

## Actions
 
Any application has actions. Actions are anything that modify the state.

With MobX you can make it explicit in your code where your actions live by marking them. 
Actions helps you to structure your code better.
It is adviced to use them on any function that modifies observables or has side effects.
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


## Reactions
*Computed values* are **values** that react automatically to state changes.
*Reactions* are **side effects** that react automatically to state changes.
Reactions _can_ be used to ensure that a certain side effect (mainly I/O) is automatically executed when relevant state changes, like logging, network requests etc.
The most commonly used reaction is the `observer` decorator for React components (see above).

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
Usage: `autorun(() => { sideEffect })`. Autorun runs the provided `sideEffect` and tracks which observable state is accessed while running the side effect.
Whenever one of the used observables is changed in the future, the same sideEffect will be run again.
Returns a disposer function to cancel the side effect. [&laquo;details&raquo;](autorun.md)

### `when`
Usage: `when(() => condition, () => { sideEffect })`.
The condition expression will react automatically to any observables is uses.
As soon as the expression returns true the sideEffect function will be invoked, but only once.
`when` returns a disposer to prematurely cancel the whole thing. [&laquo;details&raquo;](when.md)

### `autorunAsync`
Usage: `autorunAsync(() => { sideEffect }, delay)`. Similar to `autorun`, but the sideEffect will be delayed and debounced with the given `delay`.
[&laquo;details&raquo;](autorun-async.md)

### `reaction`
Usage: `reaction(() => data, data => { sideEffect }, fireImmediately = false, delay = 0)`.
A variation on `autorun` that gives more fine grained control on which observables that will be tracked.
It takes two function, the first one is tracked and returns data that is used as input for the second one, the side effect.
Unlike `autorun` the side effect won't be run initially, and any observables that are accessed while executing the side effect will not be tracked.
The side effect can be debounced, just like `autorunAsync`. [&laquo;details&raquo;](reaction.md)

## Modifiers for `observable` 

By default `oservable` is applied recursively and to values that are assigned in the future as well.
Modifiers can be used to influence how `observable` treats specific values.
* `asMap`: This is the most important modifier. Instead of creating an object with observable properties, an *Observable Map* is created instead. The main difference with observable objects is that the addition and removal of properties can be easily observed. Use `asMap` if you want a map like data structure where the keys will change over time. 
* `asFlat`: Don't apply `observable` recursively. The passed object / collection itself will be observable, but the values in it won't. This disables the possibilty to deeply observe objects.
* `asReference`: Use the passed in value verbatim, just create an observable reference to the object.
* `asStructure`: When new values are assigned, ignore the new value if it structurally equal to the previous value.

[&laquo;details&raquo;](modifiers.md)

------

# Utilities

_Here are some utilities that might make working with observable objects or computed values more convenient._

### `toJS`
Usage: `toJS(observableDataStructure)`. Converts observable data structures back to plain javascript objects, ignoring computed values. [&laquo;details&raquo;](toJS.md)

### `isObservable`
Usage: `isObservable(thing, property?)`. Returns true if the given thing, or the `property` of the given thing is observable.
Works for all observables, computed values and disposer functions of reactions. [&laquo;details&raquo;](is-observable)  

### `isObservableObject|Array|Map`
Usage: `isObservableObject(thing)`, `isObservableArray(thing)`, `isObservableMap(thing)`. Returns `true` if.., well, do the math.  

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
Low-level api that can be used be used to observe a single observable value.
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


# Functions that might get deprecated

### `map`
*Will probably by deprecated, use `observable(asMap())` instead*. Usage: `map()`, `map(keyValueObject)`, `map(entries)`.
Returns an observable, largely ES6 compliant [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) data structure.
This is useful if you want to store data based on string keys.
For the full api of the returned `ObservableMap` see *Observable maps*. 
[&laquo;details&raquo;](map.md) 

### `expr`
Usage: `expr(() => someExpression`. Just a shorthand for `computed(() => someExpression).get()`. 
`expr` is useful in some rare cases to optimize another computed function or reaction.
In general it is simpler and better to just split the function in multiple smaller computed's to achieve the same effect.
[&laquo;details&raquo;](expr.md)




