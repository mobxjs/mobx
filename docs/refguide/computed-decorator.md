# (@)computed

Computed values are values that can be derived from the existing state or other computed values.
Conceptually, they are very similar to formulas in spreadsheets.
Computed values can't be underestimated, as they help you to make your actual modifyable state as small as possible.
Besides that they are higly optimized, so use them whereever possible.

Don't confuse `computed` with `autorun`. They are both reactively invoked expressions,
but use `@computed` if you want to reactively produce a *value* that can be used by other observers and
`autorun` if you don't want to produce a new value but rather want ot achieve an *effect*.
For example imperative side effects like logging, making network requests etc.

Computed values are automatically derived from your state if any value that affects them changes.
Computed values can be optimized away in many cases by MobX as they are assumed to be pure.
For example, a computed property won't re-run if none of the data used in the previous computation changed.
Nor will a computed property re-run if is not in use by some other computed property or reaction.
In such cases it will be suspended.

This automatic suspension is very convenient. If a computed value is no longer observed, for example the UI in which it was used no longer exists, MobX can automatically garbage collect it. This differs from `autorun`'s values where you must dispose of them yourself.
It sometimes confuses people new to MobX, that if you create a computed property but don't use it anywhere in a reaction, it will not cache its value and recompute more often than seems necessary.
However, in real life situations this by far the best default, and you can always forcefully keep a computed value awake if you need to by using either [`observe`](observe.md) or [`keepAlive`](https://github.com/mobxjs/mobx-utils#keepalive).

Note that `computed` properties are not enumerable. Nor can they be overwritten in an inheritance chain.

## `@computed`

If you have [decorators enabled](../best/decorators.md) you can use the `@computed` decorator on any getter of a class property to declaratively created computed properties.

```javascript
import {observable, computed} from "mobx";

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @computed get total() {
        return this.price * this.amount;
    }
}
```

## `computed` modifier

If your environment doesn't support decorators, use the `computed(expression)` modifier in combination with `extendObservable` / `observable` to introduce new computed properties.

`@computed get propertyName() { }` is basically sugar for [`extendObservable(this, { propertyName: get func() { } })`](extend-observable.md) in the constructor call.

```javascript
import {extendObservable, computed} from "mobx";

class OrderLine {
    constructor(price) {
        extendObservable(this, {
            price: price,
            amount: 1,
            // valid:
            get total() {
                return this.price * this.amount
            },
            // also valid:
            total: computed(function() {
                return this.price * this.amount
            })
        })
    }
}
```

## Setters for computed values

It is possible to define a setter for computed values as well. Note that these setters cannot be used to alter the value of the computed property directly,
but they can be used as 'inverse' of the derivation. For example:

```javascript
const box = observable({
    length: 2,
    get squared() {
        return this.length * this.length;
    },
    set squared(value) {
        this.length = Math.sqrt(value);
    }
});
```

And similarly

```javascript
class Foo {
    @observable length: 2,
    @computed get squared() {
        return this.length * this.length;
    }
    set squared(value) { //this is automatically an action, no annotation necessary
        this.length = Math.sqrt(value);
    }
}
```

_Note: always define the setter *after* the getter, some TypeScript versions are known to declare two properties with the same name otherwise._

_Note: setters require MobX 2.5.1 or higher_

## `computed(expression)` as function

`computed` can also be invoked directly as function.
Just like `observable.box(primitive value)` creates a stand-alone observable.
Use `.get()` on the returned object to get the current value of the computation, or `.observe(callback)` to observe its changes.
This form of `computed` is not used very often, but in some cases where you need to pass a "boxed" computed value around it might prove useful.

Example:

```javascript
import {observable, computed} from "mobx";
var name = observable("John");

var upperCaseName = computed(() =>
	name.get().toUpperCase()
);

var disposer = upperCaseName.observe(change => console.log(change.newValue));

name.set("Dave");
// prints: 'DAVE'
```

## Options for `computed`

When using `computed` as modifier or as box, it accepts a second options argument with the following optional arguments:

* `name`: String, the debug name used in spy and the MobX devtools
* `context`: The `this` that should be used in the provided expression
* `setter`: The setter function to be used. Without setter it is not possible to assign new values to a computed value. If the second argument passed to `computed` is a function, this is assumed to be a setter.
* `compareStructural`: By default `false`. When true, the output of the expression is structurally compared with the previous value before any observer is notified about a change. This makes sure that observers of the computation don't re-evaluate if new structures are returned that are structurally equal to the original ones. This is very useful when working with point, vector or color structures for example.

## `@computed.struct` for structural comparison

The `@computed` decorator does not take arguments. If you want to to create a computed property which does structural comparison, use `@computed.struct`.

## Note on error handling

If a computed value throws an exception during its computation, this exception will be catched and rethrown any time its value is read.
It is strongly recommended to always throw `Error`'s, so that the original stack trace is preserved. E.g.: `throw new Error("Uhoh")` instead of `throw "Uhoh"`.
Throwing exceptions doesn't break tracking, so it is possible for computed values to recover from exceptions.

Example:

```javascript
const x = observable(3)
const y = observable(1)
const divided = computed(() => {
    if (y.get() === 0)
        throw new Error("Division by zero")
    return x.get() / y.get()
})

divided.get() // returns 3

y.set(0) // OK
divided.get() // Throws: Division by zero
divided.get() // Throws: Division by zero

y.set(2)
divided.get() // Recovered; Returns 1.5
```
