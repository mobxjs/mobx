---
title: Boxed Values
sidebar_label: boxed values
hide_title: true
---

## Primitive values and references

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

All primitive values in JavaScript are immutable and hence per definition not observable.
Usually that is fine, as MobX usually can just make the _property_ that contains the value observable.
See also [observable objects](object.md).
In rare cases it can be convenient to have an observable "primitive" that is not owned by an object.
For these cases it is possible to create an observable box that manages such a primitive.

### `observable.box(value)`

So `observable.box(value)` accepts any value and stores it inside a box.
The current value can be accessed through `.get()` and updated using `.set(newValue)`.

Furthermore you can register a callback using its `.observe` method to listen to changes on the stored value.
But since MobX tracks changes to boxes automatically, in most cases it is better to use a reaction like [`mobx.autorun`](autorun.md) instead.

So the signature of object returned by `observable.box(scalar)` is:

-   `.get()` Returns the current value.
-   `.set(value)` Replaces the currently stored value. Notifies all observers.
-   `intercept(interceptor)`. Can be used to intercept changes before they are applied. See [observe & intercept](observe.md)
-   `.observe(callback: (change) => void, fireImmediately = false): disposerFunction`. Registers an observer function that will fire each time the stored value is replaced. Returns a function to cancel the observer. See [observe & intercept](observe.md). The `change` parameter is an object containing both the `newValue` and `oldValue` of the observable.

### `observable.box(value, { deep: false })`

Creates a box based on the [`ref`](modifiers.md) decorator. This means that any (future) value of box wouldn't be converted into an observable automatically.

### Example

```javascript
import { observable } from "mobx"

const cityName = observable.box("Vienna")

console.log(cityName.get())
// prints 'Vienna'

cityName.observe(function(change) {
    console.log(change.oldValue, "->", change.newValue)
})

cityName.set("Amsterdam")
// prints 'Vienna -> Amsterdam'
```

## `observable.box(value, { name: "my array" })`

The `name` option can be used to give the box a friendly debug name, to be used in for example `spy` or the MobX dev tools.
