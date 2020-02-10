---
title: MobX Api Reference
sidebar_label: API overview
hide_title: true
---

# MobX Api Reference

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

**Applies to MobX 4 and higher**

-   Using Mobx 3? Use this [migration guide](https://github.com/mobxjs/mobx/wiki/Migrating-from-mobx-3-to-mobx-4) to switch gears.
-   [MobX 3 documentation](https://github.com/mobxjs/mobx/blob/54557dc319b04e92e31cb87427bef194ec1c549c/docs/refguide/api.md)
-   For MobX 2, the old documentation is still available on [github](https://github.com/mobxjs/mobx/blob/7c9e7c86e0c6ead141bb0539d33143d0e1f576dd/docs/refguide/api.md).

# Core API

_These are the most important MobX API's._

> Understanding `observable`, `computed`, `reaction` and `action` is enough
> to master MobX and use it in your applications!

## Creating observables

### `observable(value)`

Usage:

-   `observable(value)`
-   `@observable classProperty = value`

Observable values can be JS primitives, references, plain objects, class instances, arrays and maps.

**Note:** `observable(value)` is a convenience API that will succeed only if it can be made into
an observable data structure (_Array_, _Map_, or _observable-object_). For all other values, no conversion will be performed.

You can also directly create the desired observable type, see below.

The following conversion rules are applied, but can be fine-tuned by using [_decorators_](#decorators). See below.

1. If _value_ is an instance of an [ES6 Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map): a new [Observable Map](map.md) will be returned. Observable maps are very useful if you don't want to react just to the change of a specific entry, but also to the addition or removal of entries.
1. If _value_ is an array, a new [Observable Array](array.md) will be returned.
1. If _value_ is an object _without_ prototype or its prototype is `Object.prototype`, the object will be cloned and all its current properties will be made observable. See [Observable Object](object.md)
1. If _value_ is an object _with_ a prototype, a JavaScript primitive or function, there will be no change made to the value. If you do need a [Boxed Observable](boxed.md), you can do one of the following:
    - Call `observable.box(value)` explicitly
    - Use `@observable` in the class definition
    - Call [`decorate()`](#decorate)
    - Use `extendObservable()` to introduce properties on a class definition

MobX will not make objects with a prototype automatically observable; as that is the responsibility of its constructor function. Use `extendObservable` in the constructor, or `@observable` in its class definition instead.

These rules might seem complicated at first sight, but you will notice that in practice they are very intuitive to work with.

**Some notes:**

-   To use the `@observable` decorator, make sure that [decorators are enabled](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) in your transpiler (babel or typescript).
-   By default making a data structure observable is _infective_; that means that `observable` is applied automatically to any value that is contained by the data structure, or will be contained by the data structure in the future. This behavior can be changed by using [_decorators_](#decorators).
-   _[MobX 4 and below]_ To create dynamically keyed objects, always use maps! Only initially existing properties on an object will be made observable, although new ones can be added using `extendObservable`.

[&laquo;`observable`&raquo;](observable.md) &mdash; [&laquo;`@observable`&raquo;](observable-decorator.md)

### `@observable property = value`

`observable` can also be used as property decorator. It requires [decorators to be enabled](../best/decorators.md) and is syntactic
sugar for `extendObservable(this, { property: value })`.

[&laquo;`details`&raquo;](observable-decorator.md)

### `observable.box(value, options?)`

Creates an observable _box_ that stores an observable reference to a value. Use `get()` to get the current value of the box, and `set()` to update it.
This is the foundation on which all other observables are built, but in practice you will use it rarely.

Normal boxes will automatically try to turn any new value into an observable if it isn't already. Use the `{deep: false}` option to disable this behavior.

[&laquo;`details`&raquo;](boxed.md)

### `observable.object(value, decorators?, options?)`

Creates a clone of the provided object and makes all its properties observable.
By default any values in those properties will be made observable as well, but when using the `{deep: false}` options, only the properties will be made into observable
references, leaving the values untouched. (This holds also for any values assigned in the future).

The second argument in `observable.object()` can be used to fine tune the observability with [`decorators`](#decorators).

[&laquo;`details`&raquo;](object.md)

### `observable.array(value, options?)`

Creates a new observable array based on the provided value.

Use the `{deep: false}` option if the values in the array should not be turned into observables.

[&laquo;`details`&raquo;](array.md)

### `observable.map(value, options?)`

Creates a new observable map based on the provided value. Use the `{deep: false}` option if the values in the map should not be turned into observables.

Use `map` whenever you want to create a dynamically keyed collections and the addition / removal of keys needs to be observed.
Since this uses the full-blown _ES6 Map_ internally, you are free to use any type for the key and _not limited_ to string keys.

[&laquo;`details`&raquo;](map.md)

### `observable.set(value, options?)`

Creates a new observable map based on the provided value. Use the `{deep: false}` option if the values in the map should not be turned into observables.

Use `set` whenever you want to create a dynamic set where the addition / removal of values needs to be observed, and where values can appear only once in the collection.
Note that your browser needs to support ES6 sets, or polyfill them, to make sets work.

The api is further the same as the [ES6 set api](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)

### `extendObservable`

Usage: `extendObservable(target, properties, decorators?, options?)`.

For each key/value pair in each `properties` a (new) observable property will be introduced on the target object if the property does not already exist on the target object. If the property does exist, it will be made observable.
This can be used in constructor functions to introduce observable properties without using decorators.
If a value of the `properties` is a getter function, a _computed_ property will be introduced.

Use `extendObservable(target, properties, decorators?, {deep: false})` if the new properties should not be infective (that is; newly assigned values should not be turned into observables automatically).
Note that `extendObservable` enhances existing objects, unlike `observable.object` which creates a new object.

[&laquo;details&raquo;](extend-observable.md)

### Decorators

Use decorators to fine tune the observability of properties defined via `observable`, `extendObservable` and `observable.object`. They can also control the auto-conversion rules for specific properties.

The following decorators are available:

-   **`observable.deep`**: This is the default decorator, used by any observable. It converts any assigned, non-primitive value into an observable if it isn't one yet.
-   **`observable.ref`**: Disables automatic observable conversion, just creates an observable reference instead.
-   **`observable.shallow`**: Can only be used in combination with collections. Turns any assigned collection into a collection, which is shallowly observable (instead of deep). In other words; the values inside the collection won't become observables automatically.
-   **`computed`**: Creates a derived property, see [`computed`](computed-decorator.md)
-   **`action`**: Creates an action, see [`action`](action.md)
-   **`action.bound`**: Creates a bound action, see [`action`](action.md)

You can apply these decorators using the _@decorator_ syntax:

```javascript
import { observable, action } from "mobx"

class TaskStore {
    @observable.shallow tasks = []
    @action addTask(task) {
        /* ... */
    }
}
```

Or by passing in property decorators via `observable.object` / `observable.extendObservable` or [`decorate()`](#decorate).
Note that decorators always 'stick' to the property. So they will remain in effect even if a new value is assigned.

```javascript
import { observable, action } from "mobx"

const taskStore = observable(
    {
        tasks: [],
        addTask(task) {
            /* ... */
        }
    },
    {
        tasks: observable.shallow,
        addTask: action
    }
)
```

[&laquo;details&raquo;](modifiers.md)

### `decorate`

Usage: `decorate(object, decorators)`
This is a convenience method to apply observability [decorators](#decorators) to the properties of a plain object or class instance. The second argument is an object with properties set to certain decorators.

Use this if you cannot use the _@decorator_ syntax or need more control over setting observability.

```js
class TodoList {
    todos = {}
    get unfinishedTodoCount() {
        return values(this.todos).filter(todo => !todo.finished).length
    }
    addTodo() {
        const t = new Todo()
        t.title = "Test_" + Math.random()
        set(this.todos, t.id, t)
    }
}

decorate(TodoList, {
    todos: observable,
    unfinishedTodoCount: computed,
    addTodo: action.bound
})
```

For applying multiple decorators on a single property, you can pass an array of decorators. The decorators application order is from right to left.

```javascript
import { decorate, observable } from "mobx"
import { serializable, primitive } from "serializr"
import persist from "mobx-persist"

class Todo {
    id = Math.random()
    title = ""
    finished = false
}

decorate(Todo, {
    title: [serializable(primitive), persist("object"), observable],
    finished: [serializable(primitive), observable]
})
```

Note: Not all decorators can be composed together, and this functionality is just best-effort. Some decorators affect the instance directly and can 'hide' the effect of other decorators that only change the prototype.

## Computed values

Usage:

-   `computed(() => expression)`
-   `computed(() => expression, (newValue) => void)`
-   `computed(() => expression, options)`
-   `@computed get classProperty() { return expression; }`
-   `@computed({equals: compareFn}) get classProperty() { return expression; }`
-   `@computed.struct get classProperty() { return expression; }`

Creates a computed property. The `expression` should not have side effects but return a value.
The expression will automatically be re-evaluated if any observables it uses changes, but only if it is in use by some _reaction_.

There are various `options` that can be used to control the behavior of `computed`. These include:

-   **`equals: (value, value) => boolean`** Comparison method can be used to override the default detection on when something is changed. Built-in comparers are: `comparer.identity`, `comparer.default`, `comparer.structural`, `comparer.shallow`.
-   **`name: string`** Provide a debug name to this computed property
-   **`requiresReaction: boolean`** Wait for a change in value of the tracked observables, before recomputing the derived property
-   **`get: () => value)`** Override the getter for the computed property.
-   **`set: (value) => void`** Override the setter for the computed property
-   **`keepAlive: boolean`** Set to true to automatically keep computed values alive, rather then suspending then when there are no observers.

[&laquo;details&raquo;](computed-decorator.md)

## Actions

Any application has actions. Actions are anything that modify the state.

With MobX you can make it explicit in your code where your actions live by marking them.
Actions helps you to structure your code better.
It is advised to use them on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.
Note: using `action` is mandatory when _strict mode_ is enabled, see `enforceActions`.
[&laquo;details&raquo;](action.md)

Usage:

-   `action(fn)`
-   `action(name, fn)`
-   `@action classMethod`
-   `@action(name) classMethod`
-   `@action boundClassMethod = (args) => { body }`
-   `@action.bound boundClassMethod(args) { body }`

For one-time-actions `runInAction(name?, fn)` can be used, which is sugar for `action(name, fn)()`.

### Flow

Usage: `flow(function* (args) { })`

`flow()` takes a generator function as its only input

When dealing with _async actions_, the code that executes in the callback is not wrapped by `action`. This means the observable state that you are mutating, will fail the [`enforceActions`](#configure) check. An easy way to retain the action semantics is by wrapping the async function with flow. This will ensure to wrap all your callbacks in `action()`.

Note that the async function must be a _generator_ and you must only _yield_ to promises inside. `flow` gives you back a promise that you can `cancel()` if you want.

```js
import { configure } from "mobx"

// don't allow state modifications outside actions
configure({ enforceActions: "always" })

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    fetchProjects = flow(function* fetchProjects() {
        // <- note the star, this a generator function!
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = yield fetchGithubProjectsSomehow() // yield instead of await
            const filteredProjects = somePreprocessing(projects)

            // the asynchronous blocks will automatically be wrapped actions
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    })
}
```

_Tip: it is recommended to give the generator function a name, this is the name that will show up in dev tools and such_

**Flows can be cancelled**

Flows are canceallable, that means that you can call `cancel()` on the returned promise. This will stop the generator immediately, but any `finally` clause will still be processed.
The returned promise itself will reject with `FLOW_CANCELLED`

**Flows support async iterators**

Flows support async iterators, that means you can use async generators:

```javascript
async function* someNumbers() {
    yield Promise.resolve(1)
    yield Promise.resolve(2)
    yield Promise.resolve(3)
}

const count = mobx.flow(async function*() {
    // use for await to loop async iterators
    for await (const number of someNumbers()) {
        total += number
    }
    return total
})

const res = await count() // 6
```

## Reactions & Derivations

_Computed values_ are **values** that react automatically to state changes.
_Reactions_ are **side effects** that react automatically to state changes.
Reactions _can_ be used to ensure that a certain side effect (mainly I/O) is automatically executed when relevant state changes, like logging, network requests etc.
The most commonly used reaction is the `observer` decorator for React components (see below).

### `observer`

Can be used as higher order component around a React component.
The component will then automatically re-render if any of the observables used in the `render` function of the component has changed.
Note that `observer` is provided by the `"mobx-react"` package and not by `"mobx"` itself.

[&laquo;details&raquo;](observer-component.md)

Usage:

-   `observer(React.createClass({ ... }))`
-   `observer((props, context) => ReactElement)`
-   `observer(class MyComponent extends React.Component { ... })`
-   `@observer class MyComponent extends React.Component { ... }`

### `autorun`

Usage: `autorun(() => { sideEffect }, options)`. Autorun runs the provided `sideEffect` and tracks which observable state is accessed while running the side effect.
Whenever one of the used observables is changed in the future, the same sideEffect will be run again.
Returns a disposer function to cancel the side effect.

[&laquo;details&raquo;](autorun.md)

**options**

-   **`name?: string`**: A name for easier identification and debugging
-   **`delay?: number`**: the sideEffect will be delayed and debounced with the given `delay`. Defaults to `0`.
-   **`onError?: (error) => void`**: error handler that will be triggered if the autorun function throws an exception
-   **`scheduler?: (callback) => void`**: Set a custom scheduler to determine how re-running the autorun function should be scheduled
-   **`requiresObservable?: boolean`** Enables [`reactionRequiresObservable`](#reactionrequiresobservable-boolean) locally for the autorun

### `when`

Usage: `when(() => condition, () => { sideEffect }, options)`.
The condition expression will react automatically to any observables it uses.
As soon as the expression returns true the sideEffect function will be invoked, but only once.

**Note:** the _effect-function_ (second argument) is actually optional. If no effect-function is provided, it will return a cancelable promise (i.e. having a `cancel()` method on the promise)

`when` returns a disposer to prematurely cancel the whole thing.

If no effect function is passed to `when`, it will return a promise that can be awaited until the condition settles.

[&laquo;details&raquo;](when.md).

**options**

-   **`name?: string`**: A name for easier identification and debugging
-   **`onError?: (error) => void`**: error handler that will be triggered if the _predicate-function_ or the _effect-function_ throws an exception
-   **`timeout: number`** a timeout in milliseconds, after which the `onError` handler will be triggered to signal the condition not being met within a certain time
-   **`requiresObservable?: boolean`** Enables [`reactionRequiresObservable`](#reactionrequiresobservable-boolean) locally for the when

### `reaction`

Usage: `reaction(() => data, data => { sideEffect }, options)`.
A variation on `autorun` that gives more fine-grained control on which observables that will be tracked.
It takes two function, the first one is tracked and returns data that is used as input for the second one, the side effect.
Unlike `autorun` the side effect won't be run initially, and any observables that are accessed while executing the side effect will not be tracked.
The side effect can be debounced, just like `autorunAsync`.

[&laquo;details&raquo;](reaction.md)

**options**

-   **`fireImmediately?: boolean`**: Wait for a change before firing the _effect function_. Defaults to `false`.
-   **`delay?: number`**: the sideEffect will be delayed and debounced with the given `delay`. Defaults to `0`.
-   **`equals`**: Custom equality function to determine whether the expr function differed from it's previous result, and hence should fire effect. Accepts the same options as the equals option of `computed`.
-   Also accepts all of the options from [`autorun`](#autorun)
-   **`requiresObservable?: boolean`** Enables [`reactionRequiresObservable`](#reactionrequiresobservable-boolean) locally for the reaction

### `onReactionError`

Usage: `onReactionError(handler: (error: any, derivation) => void)`

This method attaches a global error listener, which is invoked for every error that is thrown from a _reaction_.
This can be used for monitoring or test purposes.

---

# Utilities

_Here are some utilities that might make working with observable objects or computed values more convenient.
More, less trivial utilities can be found in the \* [mobx-utils](https://github.com/mobxjs/mobx-utils) package._

### `Provider` (`mobx-react` package)

Can be used to pass stores to child components using React's context mechanism. See the [`mobx-react` docs](https://github.com/mobxjs/mobx-react#provider-experimental).

### `inject` (`mobx-react` package)

Higher order component and counterpart of `Provider`. Can be used to pick stores from React's context and pass it as props to the target component. Usage:

-   `inject("store1", "store2")(observer(MyComponent))`
-   `@inject("store1", "store2") @observer MyComponent`
-   `@inject((stores, props, context) => props) @observer MyComponent`
-   `@observer(["store1", "store2"]) MyComponent` is a shorthand for the the `@inject() @observer` combo.

### `toJS`

Usage: `toJS(observableDataStructure, options?)`. Converts observable data structures back to plain javascript objects, ignoring computed values.

The `options` include:

-   **`detectCycles: boolean`**: Checks for cyclical references in the observable data-structure. Defaults to `true`.
-   **`exportMapsAsObjects: boolean`**: Treats ES6 Maps as regular objects for export. Defaults to `true`

[&laquo;details&raquo;](tojson.md).

### `isObservable` and `isObservableProp`

Usage: `isObservable(thing)` or `isObservableProp(thing, property?)`. Returns true if the given thing, or the `property` of the given thing is observable.
Works for all observables, computed values and disposer functions of reactions.

[&laquo;details&raquo;](is-observable)

### `isObservableObject|Array|Map` and `isBoxedObservable`

Usage: `isObservableObject(thing)`, `isObservableArray(thing)`, `isObservableMap(thing)`, `isBoxedObservable(thing)`. Returns `true` if.., well, do the math.

### `isArrayLike`

Usage: `isArrayLike(thing)`. Returns `true` if the given thing is either a true JS-array or an observable (MobX-)array.
This is intended as convenience/shorthand.
Note that observable arrays can be `.slice()`d to turn them into true JS-arrays.

### `isAction`

Usage: `isAction(func)`. Returns true if the given function is wrapped / decorated with `action`.

### `isComputed` and `isComputedProp`

Usage: `isComputed(thing)` or `isComputedProp(thing, property?)`. Returns true if the given thing is a boxed computed value, or if the designated property is a computed value.

### `intercept`

Usage: `intercept(object, property?, interceptor)`.
Api that can be used to intercept changes before they are applied to an observable api. Useful for validation, normalization or cancellation.

[&laquo;details&raquo;](observe.md)

### `observe`

Usage: `observe(object, property?, listener, fireImmediately = false)`
Low-level api that can be used to observe a single observable value.

[&laquo;details&raquo;](observe.md)

### `onBecomeObserved` and `onBecomeUnobserved`

Usage: `onBecomeObserved(observable, property?, listener: () => void): (() => void)` and
`onBecomeUnobserved(observable, property?, listener: () => void): (() => void)`

These functions are hooks into the observability system of MobX and get notified when observables _start_ / _stop_ becoming observed. It can be used to execute some lazy operations or perform network fetches.

The return value is a _diposer-function_ that will detach the _listener_.

```javascript
export class City {
    @observable location
    @observable temperature
    interval

    constructor(location) {
        this.location = location
        // only start data fetching if temperature is actually used!
        onBecomeObserved(this, "temperature", this.resume)
        onBecomeUnobserved(this, "temperature", this.suspend)
    }

    resume = () => {
        log(`Resuming ${this.location}`)
        this.interval = setInterval(() => this.fetchTemperature(), 5000)
    }

    suspend = () => {
        log(`Suspending ${this.location}`)
        this.temperature = undefined
        clearInterval(this.interval)
    }

    fetchTemperature = flow(function*() {
        // data fetching logic
    })
}
```

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
