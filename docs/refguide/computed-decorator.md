# @computed

Decorator that can be used on ES6 or TypeScript derivable class properties to make them observable.
The `@computed` can only be used on `get` functions for instance properties.

Use `@computed` if you have a value that can be derived in a pure manner from other observables.

Don't confuse `@computed` with `autorun`. They are both reactively invoked expressions,
but use `@computed` if you want to reactively produce a new value that can be used by other observers and
`autorun` if you don't want to produce a new value but rather invoke some imperative code like logging, network requests etc.

Computed properties can be optimized away in many cases by MobX as they are assumed to be pure.
So they will not be invoked when their input parameters didn't modifiy or if they are not observed by some other computed value or autorun.


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

If your environment doesn't support decorators or field initializers,
`@computed get funcName() { }` is sugar for [`extendObservable(this, { funcName: func })`](extend-observable.md)


`@computed` can be parameterized. `@computed({asStructure: true})` makes sure that the result of a derivation is compared structurally instead of referentially with its preview value. This makes sure that observers of the computation don't re-evaluate if new structures are returned that are structurally equal to the original ones. This is very useful when working with point, vector or color structures for example. It behaves the same as the `asStructure` modifier for observable values.

`@computed` properties are not enumerable.

# Creating computed values with `observable` or `extendObservable`.

The functions `observable(object)` or `extendObservable(target, properties)` can be used to introduce computed properties as well,
as alternative to using the decorator. For this ES5 getters can be used, so the above example can also be written as:

```javascript
var orderLine = observable({
    price: 0,
    amount: 1,
    get total() {
        return this.price * this.amount
    }
})
```

_Note: The support for getters was introduced in MobX 2.5.1. MobX will automatically convert any argumentless function that is passed as property value to `observable` / `extendObservable` to a computed property as well,
but that form will disappear in the next major version_.

# Setters for computed values

It is possible to define a setter for computed values as well. Note that these setters cannot be used to alter the value of the computed property directly,
but they can be used as 'inverse' of the derivation. For example:

```javascript
const box = observable({
    length: 2,
    get squared() {
        return this.length * this.length
    },
    set squared(value) {
        this.length = Math.sqrt(value)
    }
})
```

_Note: setters require MobX 2.5.1 or higher_

# `computed(expression)`

`computed` can also be invoked directly as function.
Just like `observable(primitive value)` it will create a stand-alone observable.
Use `.get()` on the returned object to get the current value of the computation, or `.observe(callback)` to observe it's changes.
This form of `computed` is not used very often, but in some cases where you need to pass a "boxed" computed value around it might prove useful.

Example:
```javascript
import {observable, computed} from "mobx";
var name = observable("John");

var upperCaseName = computed(() =>
	name.get().toUpperCase()
);

var disposer = uperCaseName.observe(name => console.log(name));

name.set("Dave");
// prints: 'DAVE'
```
