---
title: (@)computed
sidebar_label: (@)computed
hide_title: true
---

# (@)computed

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 3: computed values</summary>
    <br>
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/javascript-derive-computed-values-and-manage-side-effects-with-mobx-reactions/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/javascript-derive-computed-values-and-manage-side-effects-with-mobx-reactions">Hosted on egghead.io</a>
</details>

Computed values are values that can be derived from the existing state or other computed values.
Conceptually, they are very similar to formulas in spreadsheets.
Computed values can't be underestimated, as they help you to make your actual modifiable state as small as possible.
Besides that they are highly optimized, so use them wherever possible.

Don't confuse `computed` with `autorun`. They are both reactively invoked expressions,
but use `@computed` if you want to reactively produce a _value_ that can be used by other observers and
`autorun` if you don't want to produce a new value but rather want to achieve an _effect_.
For example imperative side effects like logging, making network requests etc.

Computed values are automatically derived from your state if any value that affects them changes.
Computed values can be optimized away in many cases by MobX as they are assumed to be pure.
For example, a computed property won't re-run if none of the data used in the previous computation changed.
Nor will a computed property re-run if is not in use by some other computed property or reaction.
In such cases it will be suspended.

This automatic suspension is very convenient. If a computed value is no longer observed, for example the UI in which it was used no longer exists, MobX can automatically garbage collect it. This differs from `autorun`'s values where you must dispose of them yourself.
It sometimes confuses people new to MobX, that if you create a computed property but don't use it anywhere in a reaction, it will not cache its value and recompute more often than seems necessary.
However, in real life situations this is by far the best default, and you can always forcefully keep a computed value awake if you need to, by using either [`observe`](observe.md) or [`keepAlive`](https://github.com/mobxjs/mobx-utils#keepalive).

Note that `computed` properties are not enumerable. Nor can they be overwritten in an inheritance chain.

## `@computed`

If you have [decorators enabled](../best/decorators.md) you can use the `@computed` decorator on any getter of a class property to declaratively create computed properties.

```javascript
import { observable, computed } from "mobx"

class OrderLine {
    @observable price = 0
    @observable amount = 1

    constructor(price) {
        this.price = price
    }

    @computed get total() {
        return this.price * this.amount
    }
}
```

Otherwise, use `decorate` to introduce them:

```javascript
import { decorate, observable, computed } from "mobx"

class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        this.price = price
    }

    get total() {
        return this.price * this.amount
    }
}
decorate(OrderLine, {
    price: observable,
    amount: observable,
    total: computed
})
```

Both `observable.object` and `extendObservable` will automatically infer getter properties to be computed properties, so the following suffices:

```javascript
const orderLine = observable.object({
    price: 0,
    amount: 1,
    get total() {
        return this.price * this.amount
    }
})
```

## Setters for computed values

It is possible to define a setter for computed values as well. Note that these setters cannot be used to alter the value of the computed property directly,
but they can be used as 'inverse' of the derivation. For example:

```javascript
const orderLine = observable.object({
    price: 0,
    amount: 1,
    get total() {
        return this.price * this.amount
    },
    set total(total) {
        this.price = total / this.amount // infer price from total
    }
})
```

And similarly

```javascript
class Foo {
    @observable length = 2
    @computed get squared() {
        return this.length * this.length
    }
    set squared(value) {
        //this is automatically an action, no annotation necessary
        this.length = Math.sqrt(value)
    }
}
```

_Note: always define the setter *after* the getter, some TypeScript versions are known to declare two properties with the same name otherwise._

## `computed(expression)` as function

`computed` can also be invoked directly as function.
Just like `observable.box(primitive value)` creates a stand-alone observable.
Use `.get()` on the returned object to get the current value of the computation, or `.observe(callback)` to observe its changes.
This form of `computed` is not used very often, but in some cases where you need to pass a "boxed" computed value around it might prove useful.

Example:

```javascript
import { observable, computed } from "mobx"
var name = observable.box("John")

var upperCaseName = computed(() => name.get().toUpperCase())

var disposer = upperCaseName.observe(change => console.log(change.newValue))

name.set("Dave")
// prints: 'DAVE'
```

## Options for `computed`

When using `computed` as modifier or as box, it accepts a second options argument with the following optional arguments:

-   `name`: String, the debug name used in spy and the MobX devtools
-   `context`: The `this` that should be used in the provided expression
-   `set`: The setter function to be used. Without setter it is not possible to assign new values to a computed value. If the second argument passed to `computed` is a function, this is assumed to be a setter.
-   `equals`: By default `comparer.default`. This acts as a comparison function for comparing the previous value with the next value. If this function considers the previous and next values to be equal, then observers will not be re-evaluated. This is useful when working with structural data, and types from other libraries. For example, a computed [moment](https://momentjs.com/) instance could use `(a, b) => a.isSame(b)`. `comparer.structural` and `comparer.shallow` come in handy if you want to use structural/shallow comparison to determine whether the new value is different from the previous value (and as a result notify observers).
-   `requiresReaction`: It is recommended to set this one to `true` on very expensive computed values. If you try to read it's value, but the value is not being tracked by some observer (in which case MobX won't cache the value), it will cause the computed to throw, instead of doing an expensive re-evalution.
-   `keepAlive`: don't suspend this computed value if it is not observed by anybody. _Be aware, this can easily lead to memory leaks as it will result in every observable used by this computed value, keeping the computed value in memory!_

## `@computed.struct` for structural comparison

The `@computed` decorator does not take arguments. If you want to to create a computed property which does structural comparison, use `@computed.struct`.

## Built-in comparers

MobX provides three built-in `comparer`s which should cover most needs:

-   `comparer.identity`: Uses the identity (`===`) operator to determine if two values are the same.
-   `comparer.default`: The same as `comparer.identity`, but also considers `NaN` to be equal to `NaN`.
-   `comparer.structural`: Performs deep structural comparison to determine if two values are the same.
-   `comparer.shallow`: Performs shallow structural comparison to determine if two values are the same.

## Computed values run more often than expected

Please check the [`pitfalls`](https://mobx.js.org/best/pitfalls.html#computed-values-run-more-often-than-expected) section if you experience this.

## Note on error handling

If a computed value throws an exception during its computation, this exception will be caught and rethrown any time its value is read.
It is strongly recommended to always throw `Error`'s, so that the original stack trace is preserved. E.g.: `throw new Error("Uhoh")` instead of `throw "Uhoh"`.
Throwing exceptions doesn't break tracking, so it is possible for computed values to recover from exceptions.

Example:

```javascript
const x = observable(3)
const y = observable(1)
const divided = computed(() => {
    if (y.get() === 0) throw new Error("Division by zero")
    return x.get() / y.get()
})

divided.get() // returns 3

y.set(0) // OK
divided.get() // Throws: Division by zero
divided.get() // Throws: Division by zero

y.set(2)
divided.get() // Recovered; Returns 1.5
```

## Computeds with arguments

Sometimes you might want to have a computed value that takes one or more arguments.
In such cases mobx-util's [`computedFn`](https://github.com/mobxjs/mobx-utils#computedfn) can be used:

```typescript
// Parameterized computed views:
// Create computed's and store them in a cache
import { observable } from "mobx"
import { computedFn } from "mobx-utils"

class Todos {
    @observable todos = []

    getAllTodosByUser = computedFn(function getAllTodosByUser(userId) {
        return this.todos.filter(todo => todo.user === userId)
    })
}
```

Note: don't use arrow functions as the `this` would be incorrect.

For further details, check the mobx-utils [docs](https://github.com/mobxjs/mobx-utils#computedfn)
