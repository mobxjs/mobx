Disclaimer: this document is work in progress but reflects the latest 0.6 release.

# Reference Guide

MobX divides your application into three different concepts:

1. State
2. Views on your state
3. State management

_State_ is is all the factual information that lives inside your application.
This might be the profile of the user that is logged in, the tasks he needs to manage, or the fact that the sidebar currently collapsed.
With MobX you can make your state reactive. This means that all derived views based on your state are updated automatically.
The first section of this api documentation describes how to [make data reactive](#making-state-reactive).

_Views_ are all pieces of information that can be derived from the _State_ or its mutations.
For example; the amount of unfinished tasks, the user interface and the data mutations that need to be synced with the server.
Those are all forms of views.
The second section describes how to [react to data changes](#reacting-to-state-changes).

Finally your application has actions that _change state_.
MobX does not dictate how to change your state.
Instead of that, MobX tries to be as unobtrusive as possible.
You can use mutable objects and arrays, real references, classes and cyclic data structures to store your state.
With MobX you are free to mutate that state in any way you think is the best.

Different examples of storing state in ES5, ES6, or TypeScript, using plain objects, constructor functions or classes can be found in the [syntax documentation](syntax.md).

The third section describes some [utility functions](#utility-functions) that might come in convenient.

## Making state reactive

### makeReactive(data, options)

`makeReactive` is the swiss knife of `mobx`. It converts `data` to something reactive.
The following types are distinguished, details are described below.

* `Primitive`: Any boolean, string, number, null, undefined, date, or regex.
* `PlainObject`: Any raw javascript object that wasn't created using a constructor function
* `ComplexObject`: A javascript object that was created by a constructor function (using the `new` keyword, with the sole exception of `new Object`).
* `Array`: A javascript array; anything which `Array.isArray` yields true.
* `ViewFuncion`: A function that takes no arguments but produces a value based on its scope / closure.
* `ComplexFunction`: A function that takes one or more arguments and might produce a value

#### Primitive values
If `data` is a primitive value, _complex_ object or function, a getter/setter function is returned:
a function that returns its current value if invoked without arguments, or updates its current value if invoked with exactly one argument.
If updated, it will notify all its _observers_.

New observers can be registered by invoking the _.observe(callback, invokeImmediately=false)_ method.
If the second parameter passed to `.observe` is true, the callback will be invoked with the current value immediately.
Otherwise the callback will be invoked on the first change.
Note that you might never use `.observe` yourself; as creating new [reactive functions or side-effects](#reacting-to-state-changes) is a more high-level approach to observe one or more values.

In practice you will hardly use `makeReactive` for primitives, as most primitive values will belong to some object.

```javascript
var temperature = makeReactive(25);
temperature.observe(function(newTemperature, oldTemperature) {
  console.log('Temperature changed from ', oldTemperature, ' to ', newTemperature);
});
temperature(30);
// prints: 'Temperature changed from 25 to 30'
console.log(temperature());
// prints: '30'.
```

#### Plain objects

If `makeReactive` is invoked on a plain objects, a new plain object with reactive properties based on the original properties will be returned.
`makeReactive` will recurse into all property values of the original object.
Any values that will be assigned to these properties in the future, will be made reactive as well if needed.

View functions inside the object will become reactive properties of the object (see the next section for more info about reactive functions).
Their `this` will be bound to the object automatically.

Properties that will be added to the reactive object later on won't become reactive automatically.
This makes it easy to extend objects with, for example, functions that are not reactive themselves but instead mutate the object.
If you want to add a new reactive property to an existing object, just use `extendReactive`.

Example:
```javascript
var orderLine = makeReactive({
  price: 10,
  amount: 1,
  total: function() {
    return this.price * this.amount;
  }
});

// observe is explained below,
mobx.observe(function() {
  console.log(orderline.total);
});
// prints: 10

orderLine.amount = 3;
// prints: 30
```

The recommended way to create reactive objects is to create a constructor function and use `extendReactive(this, properties)` inside the constructor;
this keeps the responsibility of making an object inside the object and makes it impossible to accidentally use a non-reactive version of the object.
However, some prefer to not use constructor functions at all in javascript applications.
So MobX will work just as fine when using `makeReactive(plainObject)`.

#### Complex objects

Passing non-plain objects to `makeReactive` will result in a reactive reference to the object, similar to creating reactive primitive values.
The constructor of such objects is considered responsible for creating reactive properties if needed.

#### Arrays

For arrays a new, reactive array will be returned.
Like with plain objects, reactiveness is a contagious thing; all values of the array,
now or in the future, will be made reactive as well if needed.

Arrays created using `makeReactive` provide a thin abstraction over native arrays.
The most notable difference between built-in arrays is that reactive arrays cannot be sparse;
values assigned to an index larger than `length` are considered to be out-of-bounds and will not become reactive.

Furthermore, `Array.isArray(reactiveArray)` and `typeof reactiveArray === "array"` will yield `false` for reactive arrays,
but `reactiveArray instanceof Array` will return `true`.

This has consequences when passing arrays to external methods or built-in functions, like `array.concat`, as they might not handle reactive arrays correctly.
(This might improve in the future).

***To avoid issues with other libraries, just make defensive copies before passing reactive arrays to external libraries using `array.slice()`.***

Reactive arrays support all available ES5 array methods. Besides those, the following methods are available as well:

* `observe(listener, fireImmediately? = false)` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe). It returns a disposer function to stop the listener.
* `clear()` Remove all current entries from the array.
* `replace(newItems)` Replaces all existing entries in the array with new ones.
* `find(predicate: (item, index, array) => boolean, thisArg?, fromIndex?)` Find implementation, basically the same as the ES7 Array.find proposal, but with added `fromIndex` parameter.
* `remove(value)` Remove a single item by value from the array. Returns true if the item was found and removed.

#### Functions

Those are explained in the next [section](#reacting-to-state-changes).

#### Further notes on `makeReactive`.

`makeReactive` will not recurse into non-plain objects, multi-argument functions and any value that is wrapped in `asReference`.

`makeReactive` will not recurse into objects that already have been processed by `makeReactive` or `extendReactive`.

The second `options` parameter object is optional but can define using following flags:

* `as` specifies what kind of reactive object should be made. Defaults to `"auto"`. Other valid values are `"reference"`, `"struct"` (in a later version see #8).
* `scope` defined the `this` of reactive functions. Will be set automatically in most cases
* `recurse` defaults `true`. If `false`, `makeActive` will not recurse into any child values.
* `name`: can be set to assign a name to this observable, used by the developers tools in the `extras` namespaces.
* `context` can be set to specify a certain context which is reported by the developers tools defined in the `extras`namespaces. Defaults to the object which caused this value to become reactive.

More flags will be made available in the feature.

`makeReactive` is the default export of the `mobx` module, so you can use `mobx(data, opts)` as a shorthand.

### extendReactive(target, properties)

`extendReactive` works similarly to `makeReactive`, but it extends an existing object instead of creating a new one. Similar to `Object.assign` or `jQuery.extend`.
This is especially useful inside constructor functions or to extend existing (possibly already reactive) objects.

In general, it is better to use `extendReactive(target, { property : value })` than `target.property = makeReactive(value)`.
The difference is that in the later only creates a reactive value, while `extendReactive` will make the property itself reactive as well,
so that you can safely assign new values to it later on.

### asReference(value)

See `makeReactive`, the given value will not be converted to a reactive structure if it is added to another reactive structure.
The reference to it will be observable nonetheless.

In the following example the properties of the dimensions object itself won't be reactive, but assigning a new object value to the `image.dimension` will be picked up:

```javascript
var image = makeReactive({
  src: "/some/path",
  dimension: asReference({
    width: 100,
    height: 200
  })
});
```

### observable

Decorator (or annotation) that can be used on ES6 or TypeScript properties to make them reactive.

Note that in ES6 the annotation can only be used on getter functions, as ES6 doesn't support property initializers in class declarations.
See also the [syntax section](syntax.md) to see how `@observable` can be combined with different flavors of javascript code.

```javascript
import {observable} from "mobx";

class Order {
    @observable orderLines: OrderLine[] = [];
    @observable get total() {
        return this.orderLines.reduce((sum, orderLine) => sum + orderLine.total, 0)
    }
}

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @observable get total() {
        return "Total: " + this.price * this.amount;
    }
}
```

## Reacting to state changes

### makeReactive(function, options)

Responding to changes in your state is simply the matter of passing a `function` that takes no parameters to `makeReactive`.
MobX will track which reactive objects, array and other reactive functions are used by the provided function.
MobX will call `function` again when any of those values have changed.

This will happen in such a way one can never observe a stale output of `function`; updates are pushed synchronously.
Invocations of `function` will only happen when none of its dependencies is stale, so that updates are atomic.
This is a major difference with many other reactive frameworks.
This sounds complicated and expensive but in practice you won't notice any performance overhead in any reasonable scenario.
Reactive functions evaluate lazily; if nobody is observing the reactive function it will never evaluate.
For non-lazy reactive functions see `observe`.

Invoking `makeReactive` directly on a function will result in a _getter function_, similar to invoking `makeReactive` on primitive values.
If `makeReactive` encounters a function inside an object passed through it,
it will introduce a new property on that object, that uses the function as getter function for that property.

The optional `options` parameter is an object.
The `scope` property of that object can be set to define the `this` value that will be used inside the reactive function.

```javascript
var greeter = makeReactive({
  who: "world",
  greeting: function() {
    return "Hello, " + this.who + "!!!";
  }
});

var upperCaseGreeter = makeReactive(function() {
  return greeter.greeting; // greeting has become an reactive property
});

var disposer = upperCaseGreeter.observe(function(newGreeting) {
  console.log(newGreeting)
});

greeter.who = "Universe";
// Prints: 'HELLO, UNIVERSE!!!'

disposer(); // stop observing
console.log(greeter.greeting); // prints the latest version of the reactive, derived property
console.log(upperCaseGreeter()); // prints the latest version of the reactive function
```

### observe(function)

`observe` can be used in those cases where you want to create a reactive function that will never have observers itself.
This is usually the case when you need to bridge from reactive to imperative code, for example for logging, persistence or UI-updating code.
When `observe` is used, `function` will always be
triggered when one of its dependencies changes.
(In contrast, `makeReactive(function)` creates functions that only re-evaluate if it has
observers on its own, otherwise its value is considered to be irrelevant).

```javascript
var numbers = makeReactive([1,2,3]);
var sum = makeReactive(() => numbers.reduce((a, b) => a + b, 0);

var loggerDisposer = observe(() => console.log(sum());
// prints '6'
numbers.push(4);
// prints '10'

loggerDisposer();
numbers.push(5);
// won't print anything, nor is `sum` re-evaluated
```

Fun fact: `observe(func)` is actually an alias for `makeReactive(func).observe(function() { /* noop */ });`.

### reactiveComponent(component)

`reactiveComponent` turns a ReactJS component into a reactive one and is provided through the separate (and minimal) `mobx-react` package.
Making a component reactive means that it will automatically observe any reactive data it uses.

It is quite similar to `@connect` as found in several flux libraries, yet there are two important differences.
With `@reactiveComponent` you don't need to specify which store / data should be observed in order to re-render at the appropriate time.
Secondly, reactive components provide far more fine grained update semantics: Reactive components won't be observing a complete store or data tree, but only that data that is actually used during the rendering of the component. This might be a complete list, but also a single object or even a single property.
The consequence of this is that components won't re-render unless some data that is actually used in the rendering has changed. Large applications really benefit from this in terms of performance.

Rule of thumb is to use `reactiveComponent` on every component in your application that is specific for your application.
Its overhead is neglectable and it makes sure that whenever you start using reactive data the component will respond to it.
One exception are general purposes components that are not specific for your app. As these probably don't depend on the actual state of your application.
For that reason it doesn't make sense to add `reactiveComponent` to them (unless their own state is expressed using reactive data structures as well).

The `reactiveComponent` function / decorator supports both components that are constructed using `React.createClass` or using ES6 classes that extend `React.Component`. `reactiveComponent` is also available as mixin: `mobx.reactiveMixin`.

`reactiveComponent` also prevents re-renderings when the *props* of the component have only shallowly changed, which makes a lot of sense if the data passed into the component is reactive.
This behavior is similar to [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html), except that *state* changes are still always processed.
If a component provides its own `shouldComponentUpdate`, that one takes precedence.

Since in practice you will see that most reactive components become stateless, they can easily be hot-reloaded.
You will discover that many small components will consist of just a render function.
In such cases, you can also directly pass the render function to `reactiveComponent`, without building a component.
The props will then be available as first argument of the function.

_Note: when `reactiveComponent` needs to be combined with other decorators or higher-order-components, make sure that `reactiveComponent` is the most inner (first applied) decorator;
otherwise it might do nothing at all._

**ES6 class + decorator**
```javascript
@reactiveComponent class MyComponent extends React.Component {
  /* .. */
}
```

**ES6 class + function call**
```javascript
reactiveComponent(class MyCompoment extends React.Component {
  /* .. */
});
```

**ES5 + React.createClass**
```javascript
var MyComponent = reactiveComponent(React.createClass({
  /* .. */
}))
```

**ES5/6 + render function**
```javascript
var MyComponent = reactiveComponent(function (props) {
    return <rendering />;
});
```

## Utility functions

### isReactive(value)

Returns true if the given value was created or extended by mobx. Note: this function cannot be used to tell whether a property is reactive; it will determine the reactiveness of its actual value.

### toJson(value)

Converts a non-cyclic tree of observable objects into a JSON structure that is not observable. It is kind of the inverse of `mobx.makeReactive`

### transaction(workerFunction)

Transaction postpones the updates of computed properties until the (synchronous) `workerFunction` has completed.
This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, e.g. while refreshing data from the back-end.
In practice, you will probably never need `.transaction`, since observables typically update wickedly fast.

```javascript
var amount = mobx(3);
var price = mobx(2.5);
var total = mobx(function() {
    return amount() * price();
});
total.observe(console.log);

// without transaction:
amount(2); // Prints 5
price(3); // Prints 6

// with transaction:
mobx.transaction(function() {
    amount(3);
    price(4);
});
// Prints 12, after completing the transaction
```

### extras.getDependencyTree(thing, property?)

Accepts something reactive and prints its current dependency tree; other reactive values it depends on. For observers, this method can be invoked on its disposer.
Works for React components as well, but only if they are actually mounted (otherwise they won't be observing any data).
For object properties, pass in the property name as second argument. `id` is unique and generated by mobx.
`name` and `context` are determined automatically, unless they were overriden in the options passed to `makeReactive`.
The returned dependency tree is a recursive structure with the following signature:

```javascript
interface IDependencyTree {
    id: number;
    name: string;
    context: any;
    dependencies?: IDependencyTree[];
}
```


### extras.getObserverTree(thing, property?)

Similar to `getDependencyTree`, but observer tree returns a tree of all objects that are depending on `thing`. It returns a tree structure with the following structure:

```javascript
interface IObserverTree {
    id: number;
    name: string;
    context: any;
    observers?: IObserverTree[];
    listeners?: number;
}
```

`listeners` defines the amount of external observers, attached by using `.observe` of some reactive value. Side-effects will always report 1 listener.

### extras.trackTransitions(extensive, onReport)

Debugging tool that reports each change in a reactive value.
The optional `extensive` boolean indicates whether all control events should be reported, or only the events that changes a value. Defaults to `false`.
The `onReport` function is a callback that will be invoked for each transition. If omitted, the reports will be printed to the console.
`trackTransitions` returns a function that can be used to stop the tracker.

Each transition is reported as an object with the following signature. The `state` value is either `STALE`, `PENDING` or `READY`.

```javascript
interface ITransitionEvent {
    id: number;
    name: string;
    context: Object;
    state: string;
    changed: boolean;
    newValue: string;
}
```
