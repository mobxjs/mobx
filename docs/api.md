# API Documentation

## mobservable top level api

### makeReactive(data, options)

`makeReactive` is the swiss knife of `mobservable`. It converts `data` to something similar, but reactive, based on the type of `data`.
The following types are distinguished:

* `Primitive`: boolean, string, number, null, undefined, date
* `PlainObject`: raw javascript objects that was not created using a constructor function
* `ComplexObject`: raw javascript object that was created using a constructor function
* `Array`
* `ViewFuncion`: function that takes no arguments but produces a value
* `ComplexFunction`: function that takes one or more arguments and might produce a value

If `data` is a primitive value, _complex_ object or function, a _[reactive getter/setter](#reactive-getter-setter)_ will be returned.

For plain objects, a plain object with reactive properties will be returned. View functions inside the object will become reactive properties of the object. Their `this` will be bound to the object.

For arrays an [reactive array](#reactive-array) will be returned.

Reactiveness is an contagious thing; all values that are part of `data`, or will be in same future time,
will be made reactive as well.
Except for non-plain objects, multi-argument functions or any value that is wrapped in `asReference`.

`makeReactive` will not recurse into objects that already have been processed by `makeReactive` or `extendReactive`.


The `options` object is optional but can define the following flags:

* `as` specifies what kind of reactive object should be made. Defaults to `"auto"`. Other valid values are `"reference"`, `"struct"` (in a later version see #8).
* `scope` defined the `this` of reactive functions. Will be set automatically in most cases
* `recurse` defaults `true`. If `false`, `makeActive` will not recurse into any child values.

`makeReactive` is the default export of the `mobservable` module, so `mobservable(value) === mobservable.makeReactive(value)`.

```javascript
var todoStore = mobservable.makeReactive({
    todos: [
        {
            title: 'Find a clean mug',
            completed: true
        },
        {
            title: 'Make coffee',
            completed: false
        }
    ],
    completedCount: function() {
        return this.todos.filter((todo) => todo.completed).length;
    },
    pending: 0
});
```

### extendReactive(target, properties)

Creates reactive `properties` on the given `target` object. Works similar to `makeReactive`, but extends existing objects.
This is especially useful inside constructor functions or to extend existing (possibly already reactive) objects.

### isReactive(value)

Returns true if the given value was created or extended by mobservable.

### asReference(value)

See `makeReactive`, the given value will not be converted to a reactive structure if its added to another reactive structure. The reference to it will be observable nonetheless.

### observable

Decorator (or annotation) that can be used on ES6 or TypeScript properties to make them reactive.
It can be used on functions as well for reactive derived data, but for consistency it is recommended to assign it to a getter in that case.

```javascript
/// <reference path="./node_modules/mobservable/dist/mobservable.d.ts"/>
import {observable, sideEffect} from "mobservable";

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

### sideEffect(function)

Makes `function` reactive. The difference with `makeReactive(function)` is that in cases where `sideEffect` is used, `function` will always be
triggered when one of its dependencies changes, whereas `makeReactive(function)` creates reactive functions that only re-evaluate if it has
observers on its own. `sideEffect` return a functions that cancels its effect.

`sideEffect` is very useful if you need to bridge from reactive to imperative code, for example:

```javascript
var numbers = makeReactive([1,2,3]);
var sum = makeReactive(() => numbers.reduce((a, b) => a + b, 0);

var loggerDisposer = sideEffect(() => console.log(sum());
// prints '6'
numbers.push(4);
// prints '10'

loggerDisposer();
numbers.push(5);
// won't print anything, nor is `sum` re-evaluated

```

### observeUntilInvalid(functionToObserve, onInvalidate)

`observeUntilInvalid` is quite similar to `sideEffect`, but instead of re-evaluating `functionToObserve` when one of its dependencies has changed,
the `onInvalidate` function is triggered instead.
So `functionToObserve` will be evaluated only once, and as soon as its value has become stale, the `onInvalidate` callback is triggered.
`observeUntilInvalid` returns a tuple consisting of the initial return value of `func` and an `unsubscriber` to be able to abort the observeUntilInvalid.
The `onInvalidate` function will be called only once, after that, the observeUntilInvalid has finished.

`observeUntilInvalid` is useful in functions where you want to have a function that responds to change, but where the function is actually invoked as side effect or as part of a bigger change flow or where unnecessary recalculations of `func` or either pointless or expensive, e.g. in the `render` method of a React component.

### transaction(workerFunction)

Transaction postpones the updates of computed properties until the (synchronous) `workerFunction` has completed.
This is useful if you want to apply a bunch of different updates throughout your model before needing the updated computed values, e.g. while refreshing data from the backend.
In practice, you wil probably never need `.transaction`, since observables typically update wickedly fast.

```javascript
var amount = mobservable(3);
var price = mobservable(2.5);
var total = mobservable(function() {
    return amount() * price();
});
total.observe(console.log);

// without transaction:
amount(2); // Prints 5
price(3); // Prints 6

// with transaction:
mobservable.transaction(function() {
    amount(3);
    price(4);
});
// Prints 12, after completing the transaction
```

### toJson(value)

Converts a non-cyclic tree of observable objects into a JSON structure that is not observable. It is kind of the inverse of `mobservable.makeReactive`

### reactiveComponent(component)

Turns a React component into a reactive one.
Making a component reactive means that it will automatically observe any reactive data it uses.
Ut is quite similar to `@connect` as found in several flux libraries, yet there are two important differences.
With `@reactiveComponent` you don't need to specify which store / data should be observed in order to re-render at the appropriate time.
Secondly, reactive components provide far more fine grained update semantics: Reactive components won't be observing a complete store or data tree, but only that data that is actually used during the rendering of the component. This might be a complete list, but also a single object or even a single property.
The consequence of this is that components won't re-render unless some data that is actually used in the rendering has changed. Large applications really benefit from this in terms of performance.

Rule of thumb is to use `reactiveComponent` on every component in your application that is specific for your application. Its overhead is neglectable and it makes sure that whenever you start using reactive data the component will respond to it. One exception are general purposes components that are not specific for your app. As these probably don't depend on the actual state of your application. For that reason it doesn't make sense to add `reactiveComponent` to them (unless their own state is expressed using reactive data structures as well).

The `reactiveComponent` function / decorator supports both components that are constructed using `React.createClass` or using ES6 classes that extend `React.Component`. `reactiveComponent` is also available as mixin: `mobservable.reactiveMixin`.

`reactiveComponent` also prevents re-renderings when the *props* of the component have only shallowly changed, which makes a lot of sense if the data passed into the component is reactive.
This behavior is similar to [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html), except that *state* changes are still always processed.
If a component provides its own `shouldComponentUpdate`, that one takes precedence.

## reactive array

The arrays created using `makeReactive` provide thin abstraction over native arrays and to add reactive entries in the array.
The most notable difference between built-in arrays is that reactive arrays cannot be sparse, i.e. values assigned to an index larger than `length` are considered out-of-bounds and not observed.

Furthermore, `Array.isArray(reactiveArray)` and `typeof reactiveArray === "array"` will yield `false` for reactive arrays, but `reactiveArray instanceof Array` will return `true`.

Reactive arrays implement all the ES5 array methods. Besides those, the following methods are available as well:

* `observe(listener:(changeData:IArrayChange<T>|IArraySplice<T>)=>void, fireImmediately?:boolean):Lambda` Listen to changes in this array. The callback will receive arguments that express an array splice or array change, conforming to [ES7 proposal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe)
* `clear(): T[]` Remove all current entries from the array.
* `replace(newItems:T[])` Replaces all existing entries in the array with new ones.
* `values(): T[]` Returns a shallow, non-observable clone of the array, similar to `.slice`.
* `clone(): IObservableArray<T>` Create a new observable array containing the same values.
* `find(predicate:(item:T,index:number,array:IObservableArray<T>)=>boolean,thisArg?,fromIndex?:number):T` Find implementation, basically the same as the ES7 Array.find proposal, but with added `fromIndex` parameter.
* `remove(value:T):boolean` Remove a single item by value from the array. Returns true if the item was found and removed.

## reactive getter/setter

A reactive getter/setter is a function that wraps a primitive reactive value. If it is invoked without arguments, it returns the current value.
If it is invoked with a value, the current value will be updated with that value.
Futher it exposes an `observe` function which can be used to attach a listener to the getter/setter function to be notified of any future updates.

It's full interface is:

```typescript
interface IObservableValue<T> {
    (): T;
    (value: T);
    observe(callback: (newValue: T, oldValue: T)=>void, fireImmediately?: boolean): () => void /* disposer */;
}
```
