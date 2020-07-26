---
title: (@)computed
sidebar_label: (@)computed
hide_title: true
---

# (@)computed

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

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
    total: computed,
})
```

Both `observable.object` and `extendObservable` will automatically infer getter properties to be computed properties, so the following suffices:

```javascript
const orderLine = observable.object({
    price: 0,
    amount: 1,
    get total() {
        return this.price * this.amount
    },
})
```

## Computed values are not getters

The previous computed examples in the `OrderLine` class use the `get` keyword however, they generally should not be accessed directly as a getter. This can be a source of confusion to users new to Mobx from other derived cascading data layers like Reselect. The following code demonsrates the issue.

```
const Ol = new OrderLine(2.00)

// don't do this.
// avoid accessing Ol.total directly
// it will recompute everytime.
setInterval(() => {
  console.log(Ol.total);
}, 60);
```

As long as a computed value is not used by a reaction, it is not memoized and so it executes everytime it is accessed just like a normal eager evaluating function. This can cause performance degredation if a computed value is read high in a frequency loop like `requestAnimationFrame`. MobX can be configured to report an error when computeds are being access directly by using the `computedRequiresReaction` option

```javascript
configure({
    computedRequiresReaction: true,
})
```

Though this restriction is confusing and contradictory. Computeds can be altered to work in a direct access manner with some of the following methods...

### Computed memoization with reactions

A computed value should always be read by a reaction. Reading a computed value directly will cause it to recompute which can be expensive, depending on the how complex the derived result is. The following code uses the previous `OrderLine` class example and memoizes the `total` value so that it can be read directly.

```javascript
class OrderLine {
    @observable price = 0
    @observable amount = 1

    constructor(price) {
        this.price = price
        // When computed total changes
        // cache value to this.total
        autorun(() => {
            this.total = this.computedTotal
        })
    }

    @computed get computedTotal() {
        return this.price * this.amount
    }
}

const Ol = new OrderLine(2.0)

// this is now ok
// because total will be cached from computeTotal
// when its dependencies are updated
setInterval(() => {
    console.log(Ol.total)
}, 60)
```

### Computed KeepAlive

A computed may be initalized with the `keepAlive` flag. `keepAlive` will cause the computed to act as though it is observed by a reaction. This is a convience method and `keepAlive` does the same as the autorun in example above, but it does it a lot more efficient (it can for example keep the computed alive, but defer computation until somebody actually reads the value, something the autorun can't do).

```javascript
class OrderLine {
    @observable price = 0
    @observable amount = 1

    constructor(price) {
        this.price = price
    }

    @computed({ keepAlive: true })
    get total() {
        return this.price * this.amount
    }
}
```

### Autorun vs keepAlive

The only case where autorun would be more beneficial than a `keepAlive` computed, is during a manual management case in which you call the returned disposer to nicely clean up the computed value if it is no longer used typically you would do that in a destructor of a class for example.

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
    },
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

var disposer = upperCaseName.observe((change) => console.log(change.newValue))

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

MobX provides four built-in `comparer`s which should cover most needs:

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
        return this.todos.filter((todo) => todo.user === userId)
    })
}
```

Note: don't use arrow functions as the `this` would be incorrect.

For further details, check the mobx-utils [docs](https://github.com/mobxjs/mobx-utils#computedfn)
