---
title: computed
sidebar_label: computed
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

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

Setters are automatically marked as actions.

## Computed with arguments

[🚀] Sometimes you might want to have a computed value that takes one or more arguments. In such cases mobx-util's [`computedFn`](https://github.com/mobxjs/mobx-utils#computedfn) can be used:

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

## `isComputed`

Usage:

-   `isComputed(value)`

Returns `true` if `value` is a boxed computed value.

## `isComputedProp`

Usage:

-   `isComputedProp(obj, propertyName)`

Returns `true` if the designated property is a computed value.

## More about computed

[🚀] You can pass [options into `computed`](computed-options.md). If you experience
unexpected behavior, you can also read more about the [detailed behavior of `computed`](computed-behavior.md).
