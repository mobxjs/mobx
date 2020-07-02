---
title: How computed works
sidebar_label: How computed works
hide_title: true
---

# How `computed` works

Here we go into some more details concerning how computed behaves. Since `computed` tries to be tranparent in its behavior you normally do not need to be aware of them,
but is useful to know if something unexpected happens.

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

You can forcefully keep a computed value awake if you need to, by using [`keepAlive`](computed-options.md#computed-keepalive) or by using [`observe`](observe.md).

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
