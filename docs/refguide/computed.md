---
title: computed
sidebar_label: computed
hide_title: true
---

# computed

Computed values are values that can be derived from the existing state or other computed values.
Conceptually, they are very similar to formulas in spreadsheets.
Computed values can't be underestimated, as they help you to make your actual modifiable state as small as possible.
Besides that they are highly optimized, so use them wherever possible.

Computed values are automatically derived from your state if any value that affects them changes.
MobX can optimize the calculation of computed values away in many cases because
this calculation is assumed to be pure.
For example, a computed property won't re-run if no observable data used in the previous computation changed.
Nor will a computed property re-run if is not in use by some other computed property or a reaction. In such cases it is suspended.

If a computed value is no longer observed, for example because the UI in which it was used no longer exists, MobX automatically garbage collects it.

To create a `computed` property, you need to use a JavaScript [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get). `computed`
properties cannot use arguments (though see [computed with arguments](computed.md#computed-with-arguments)).

Note that `computed` properties are not [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties). Nor can they be overwritten in an inheritance chain.

Don't confuse `computed` with [`autorun`](autorun.md). They are both reactively invoked expressions, but use `computed` if you want to reactively produce a _value_ that can be used by other observers and `autorun` if you don't want to produce a new value but rather want to achieve an _effect_. For example imperative side effects like logging, making network requests etc.

## Declaring a getter as `computed`

You can use `makeObservable` to declare a getter as computed:

```javascript
import { makeObservable, observable, computed } from "mobx"

class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        makeObservable(this, {
            price: observable,
            amount: observable,
            total: computed
        })
        this.price = price
    }

    get total() {
        return this.price * this.amount
    }
}
```

If you use `makeAutoObservable`, all getters are automatically declared
computed:

```javascript
import { makeAutoObservable } from "mobx"

class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        makeAutoObservable(this)
        this.price = price
    }

    get total() {
        return this.price * this.amount
    }
}
```

Both `observable.object` and `extendObservable` will automatically infer getter properties to be computed properties as well, so the following suffices:

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

It is possible to define a [setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) for computed values as well. Note that these setters cannot be used to alter the value of the computed property directly,
but they can be used as 'inverse' of the derivation. For example:

```javascript
class Foo {
    length = 2

    constructor() {
        makeAutoObservable(this)
    }

    get squared() {
        return this.length * this.length
    }
    set squared(value) {
        //this is automatically an action, no annotation necessary
        this.length = Math.sqrt(value)
    }
}
```

_Note: always define the setter *after* the getter, some TypeScript versions are known to declare two properties with the same name otherwise._

## Options for `computed`

You can pass an `options` argument to `computed`:

-   `name`: String, the debug name used in spy and the MobX devtools
-   `context`: The `this` that should be used in the provided expression
-   `set`: The setter function to be used. Without setter it is not possible to assign new values to a computed value. If the options argument passed to `computed` is a function, this is assumed to be a setter.
-   `equals`: By default `comparer.default`. This acts as a comparison function for comparing the previous value with the next value. If this function considers the previous and next values to be equal, then observers will not be re-evaluated. This is useful when working with structural data, and types from other libraries. For example, a computed [moment](https://momentjs.com/) instance could use `(a, b) => a.isSame(b)`. `comparer.structural` and `comparer.shallow` come in handy if you want to use structural/shallow comparison to determine whether the new value is different from the previous value (and as a result notify observers).
-   `requiresReaction`: It is recommended to set this one to `true` on very expensive computed values. If you try to read its value, but the value is not being tracked by some observer (in which case MobX won't cache the value), it causes the computed to throw, instead of doing an expensive re-evalution.
-   `keepAlive`: don't suspend this computed value if it is not observed by anybody. _Be aware, this can lead to memory leaks as it will result in every observable used by this computed value to keep the computed value in memory!_

A shortcut to declare a computed for structural comparison is to use `computed.struct`.

### Built-in comparers

MobX provides four built-in `comparer`s which should cover most needs:

-   `comparer.identity`: Uses the identity (`===`) operator to determine if two values are the same.
-   `comparer.default`: The same as `comparer.identity`, but also considers `NaN` to be equal to `NaN`.
-   `comparer.structural`: Performs deep structural comparison to determine if two values are the same.
-   `comparer.shallow`: Performs shallow structural comparison to determine if two values are the same.

## Error handling

If a computed value throws an exception during its computation, this exception is caught and rethrown each time its value is read. This is what you would expect.

It is strongly recommended to always throw `Error`'s, so that the original stack trace is preserved. E.g.: `throw new Error("Uhoh")` instead of `throw "Uhoh"`.
Throwing exceptions doesn't break tracking, so it is possible for computed values to recover from exceptions.

Example:

```javascript
class Divider {
    constructor(x, y) {
        this.x = x
        this.y = y
        makeAutoObservable(this)
    }

    recover() {
        this.y = 1
    }

    divideByZero() {
        this.y = 0
    }

    get divided() {
        if (this.x === 0) {
            throw new Error("Division by zero")
        }
        return x / y
    }
}

const divider = new Divider(3, 1)

divider.divided // returns 3

// trigger action that causes divided to throw
divider.divideByZero()

divider.divided // Throws: Division by zero
divider.divided // Throws: Division by zero

// trigger action that makes error go away
divider.recover()

divided.divided // Recovered; Returns 1.5
```

## Computed with arguments

Sometimes you might want to have a computed value that takes one or more arguments.
In such cases mobx-util's [`computedFn`](https://github.com/mobxjs/mobx-utils#computedfn) can be used:

```javascript
import { observable } from "mobx"
import { computedFn } from "mobx-utils"

class Todos {
    todos = []

    constructor() {
        makeAutoObservable(this)
    }

    getAllTodosByUser = computedFn(function getAllTodosByUser(userId) {
        return this.todos.filter(todo => todo.user === userId)
    })
}
```

Note: don't use arrow functions as the `this` would be incorrect.

For further details, check the mobx-utils [docs](https://github.com/mobxjs/mobx-utils#computedfn)

## Accessing computed values outside of reactions

The optimization of `computed` only works if it is observed by some type of reaction, such as [`autorun`](autorun.md), the [`reaction` function](reaction.md) or a [React `observer` component](../react/react-integration.md)).

Reading a computed value directly causes it to recompute which can be expensive, depending on the how complex the derived result is.

It sometimes confuses people new to MobX (perhaps used to a library like [Reselect](https://github.com/reduxjs/reselect)) that if you create a computed property but don't use it anywhere in a reaction, it is not memoized and appears to be recomputed more often than necessary.

It works this way because you expect computed properties to work outside of reactions, but MobX also avoids unnecessarily updating computed values that are not in use.

The following code demonstrates the issue.

```javascript
const line = new OrderLine(2.0)

// if you access line.total directly it recomputed every time
// this is not ideal
setInterval(() => {
    console.log(line.total)
}, 60)
```

This can cause performance degradation if a computed value is read in a high frequency loop like `requestAnimationFrame`.

MobX can be configured to report an error when computeds are being access directly by using the `computedRequiresReaction` option

```javascript
configure({
    computedRequiresReaction: true
})
```

You can forcefully keep a computed value awake if you need to, by using [`keepAlive`](https://github.com/mobxjs/mobx-utils#keepalive) or by using [`observe`](observe.md).

### Computed `keepAlive`

A computed may be initalized with the `keepAlive` flag. `keepAlive` causes the computed to act as though it is observed by a reaction:

```javascript
class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        makeAutoObservable(this, { total: computed({ keepAlive: true }) })
        this.price = price
    }

    @computed({ keepAlive: true })
    get total() {
        return this.price * this.amount
    }
}
```

_Be aware, this can lead to memory leaks as it will result in every observable used by this computed value to keep the computed value in memory!_

## `computed(expression)` as function

`computed` can also be invoked directly as function.
Just like [`observable.box`](boxed.md) creates a stand-alone observable.
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

## Computed values run more often than expected

Please check the [`pitfalls`](https://mobx.js.org/best/pitfalls.html#computed-values-run-more-often-than-expected) section if you experience this.
