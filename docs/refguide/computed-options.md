---
title: Options for computed
sidebar_label: Options for computed
hide_title: true
---

# Options for computed

Usually `computed` behaves the way you want it to out of the box, but
it's possible to customize its behavior by passing in an `options` argument:

-   `name`: String, the debug name used in spy and the MobX devtools
-   `context`: The `this` that should be used in the provided expression
-   `set`: The setter function to be used. Without setter it is not possible to assign new values to a computed value. If the options argument passed to `computed` is a function, this is assumed to be a setter.
-   `equals`: By default `comparer.default`. This acts as a comparison function for comparing the previous value with the next value. If this function considers the previous and next values to be equal, then observers will not be re-evaluated. This is useful when working with structural data, and types from other libraries. For example, a computed [moment](https://momentjs.com/) instance could use `(a, b) => a.isSame(b)`. `comparer.structural` and `comparer.shallow` come in handy if you want to use structural/shallow comparison to determine whether the new value is different from the previous value (and as a result notify observers).
-   `requiresReaction`: It is recommended to set this one to `true` on very expensive computed values. If you try to read its value, but the value is not being tracked by some observer (in which case MobX won't cache the value), it causes the computed to throw, instead of doing an expensive re-evalution.
-   `keepAlive`: don't suspend this computed value if it is not observed by anybody. _Be aware, this can lead to memory leaks as it will result in every observable used by this computed value to keep the computed value in memory!_

A shortcut to declare a computed for structural comparison is to use `computed.struct`.

## Built-in comparers

MobX provides four built-in `comparer`s which should cover most needs:

-   `comparer.identity`: Uses the identity (`===`) operator to determine if two values are the same.
-   `comparer.default`: The same as `comparer.identity`, but also considers `NaN` to be equal to `NaN`.
-   `comparer.structural`: Performs deep structural comparison to determine if two values are the same.
-   `comparer.shallow`: Performs shallow structural comparison to determine if two values are the same.

You can import `comparer` from `mobx` to access these.

## Computed `keepAlive`

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

See also [accessing computed values outside of reactions](computed-behavior.md#accessing-computed-values-outside-of-reactions).

_Be aware, this can lead to memory leaks as it will result in every observable used by this computed value to keep the computed value in memory!_
