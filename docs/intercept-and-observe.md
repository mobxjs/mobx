---
title: Intercept & Observe
sidebar_label: Intercept & Observe {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Intercept & Observe {🚀}

_⚠️ **Warning**: intercept and observe are low level utilities, and should not be needed in practice. Use some form of [reaction](reactions.md) instead, as `observe` doesn't respect transactions and doesn't support deep observing of changes. Using these utilities is an anti-pattern. If you intend to get access to the old and new value using `observe`, use [`reaction`](reactions.md#reaction) instead. ⚠️_

`observe` and `intercept` can be used to monitor the changes of a single observable, but they **_don't_** track nested observables.

-   `intercept` can be used to detect and modify mutations before they are applied to the observable (validating, normalizing or cancelling).
-   `observe` allows you to intercept changes after they have been made.

## Intercept

Usage: `intercept(target, propertyName?, interceptor)`

_Please avoid this API. It basically provides a bit of aspect-oriented programming, creating flows that are really hard to debug. Instead, do things like data validation **before** updating any state, rather than during._

-   `target`: the observable to guard.
-   `propertyName`: optional parameter to specify a specific property to intercept. Note that `intercept(user.name, interceptor)` is fundamentally different from `intercept(user, "name", interceptor)`. The first tries to add an interceptor to the _current_ `value` inside `user.name`, which might not be an observable at all. The latter intercepts changes to the `name` _property_ of `user`.
-   `interceptor`: callback that is invoked for _each_ change that is made to the observable. Receives a single change object describing the mutation.

The `intercept` should tell MobX what needs to happen with the current change.
Therefore it should do one of the following things:

1. Return the received `change` object as-is from the function, in which case the mutation will be applied.
2. Modify the `change` object and return it, for example to normalize the data. Not all fields are modifiable, see below.
3. Return `null`, this indicates that the change can be ignored and shouldn't be applied. This is a powerful concept with which you can for example make your objects temporarily immutable.
4. Throw an exception, if for example some invariant isn't met.

The function returns a `disposer` function that can be used to cancel the interceptor when invoked.
It is possible to register multiple interceptors to the same observable.
They will be chained in registration order.
If one of the interceptors returns `null` or throws an exception, the other interceptors won't be evaluated anymore.
It is also possible to register an interceptor both on a parent object and on an individual property.
In that case the parent object interceptors are run before the property interceptors.

```javascript
const theme = observable({
    backgroundColor: "#ffffff"
})

const disposer = intercept(theme, "backgroundColor", change => {
    if (!change.newValue) {
        // Ignore attempts to unset the background color.
        return null
    }
    if (change.newValue.length === 6) {
        // Correct missing '#' prefix.
        change.newValue = "#" + change.newValue
        return change
    }
    if (change.newValue.length === 7) {
        // This must be a properly formatted color code!
        return change
    }
    if (change.newValue.length > 10) {
        // Stop intercepting future changes.
        disposer()
    }
    throw new Error("This doesn't look like a color at all: " + change.newValue)
})
```

## Observe

Usage: `observe(target, propertyName?, listener, invokeImmediately?)`

_See above notice, please avoid this API and use [`reaction`](reactions.md#reaction) instead._

-   `target`: the observable to observe.
-   `propertyName`: optional parameter to specify a specific property to observe. Note that `observe(user.name, listener)` is fundamentally different from `observe(user, "name", listener)`. The first observes the _current_ `value` inside `user.name`, which might not be an observable at all. The latter observes the `name` _property_ of `user`.
-   `listener`: callback that will be invoked for _each_ change that is made to the observable. Receives a single change object describing the mutation, except for boxed observables, which will invoke the `listener` with two parameters: `newValue, oldValue`.
-   `invokeImmediately`: _false_ by default. Set it to _true_ if you want `observe` to invoke the `listener` directly with the state of the observable, instead of waiting for the first change. Not supported (yet) by all kinds of observables.

The function returns a `disposer` function that can be used to cancel the observer.
Note that `transaction` does not affect the working of the `observe` method(s).
This means that even inside a transaction `observe` will fire its listeners for each mutation.
Hence [`autorun`](reactions.md#autorun) is usually a more powerful and declarative alternative to `observe`.

_`observe` reacts to **mutations** when they are being made, while reactions like `autorun` or `reaction` react to **new values** when they become available. In many cases the latter is sufficient._

Example:

```javascript
import { observable, observe } from "mobx"

const person = observable({
    firstName: "Maarten",
    lastName: "Luther"
})

// Observe all fields.
const disposer = observe(person, change => {
    console.log(change.type, change.name, "from", change.oldValue, "to", change.object[change.name])
})

person.firstName = "Martin"
// Prints: 'update firstName from Maarten to Martin'

// Ignore any future updates.
disposer()

// Observe a single field.
const disposer2 = observe(person, "lastName", change => {
    console.log("LastName changed to ", change.newValue)
})
```

Related blog: [Object.observe is dead. Long live mobx.observe](https://medium.com/@mweststrate/object-observe-is-dead-long-live-mobservable-observe-ad96930140c5)

## Event overview

The callbacks of `intercept` and `observe` will receive an event object which has at least the following properties:

-   `object`: the observable triggering the event.
-   `debugObjectName`: the name of the observable triggering the event (for debugging).
-   `observableKind`: the type of the observable (value, set, array, object, map, computed).
-   `type` (string): the type of the current event.

These are the additional fields that are available per type:

| Observable type              | Event type | Property     | Description                                                                                       | Available during intercept | Can be modified by intercept |
| ---------------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------- |
| Object                       | add        | name         | Name of the property being added.                                                                 | √                          |                              |
|                              |            | newValue     | The new value being assigned.                                                                     | √                          | √                            |
|                              | update\*   | name         | Name of the property being updated.                                                               | √                          |                              |
|                              |            | newValue     | The new value being assigned.                                                                     | √                          | √                            |
|                              |            | oldValue     | The value that is replaced.                                                                       |                            |                              |
| Array                        | splice     | index        | Starting index of the splice. Splices are also fired by `push`, `unshift`, `replace`, etc.        | √                          |                              |
|                              |            | removedCount | Amount of items being removed.                                                                    | √                          | √                            |
|                              |            | added        | Array with items being added.                                                                     | √                          | √                            |
|                              |            | removed      | Array with items that were removed.                                                               |                            |                              |
|                              |            | addedCount   | Amount of items that were added.                                                                  |                            |                              |
|                              | update     | index        | Index of the single entry being updated.                                                          | √                          |                              |
|                              |            | newValue     | The newValue that is / will be assigned.                                                          | √                          | √                            |
|                              |            | oldValue     | The old value that was replaced.                                                                  |                            |                              |
| Map                          | add        | name         | The name of the entry that was added.                                                             | √                          |                              |
|                              |            | newValue     | The new value that is being assigned.                                                             | √                          | √                            |
|                              | update     | name         | The name of the entry being updated.                                                              | √                          |                              |
|                              |            | newValue     | The new value that is being assigned.                                                             | √                          | √                            |
|                              |            | oldValue     | The value that has been replaced.                                                                 |                            |                              |
|                              | delete     | name         | The name of the entry being removed.                                                              | √                          |                              |
|                              |            | oldValue     | The value of the entry that was removed.                                                          |                            |                              |
| Boxed & computed observables | create     | newValue     | The value that was assigned during creation. Only available as `spy` event for boxed observables. |                            |                              |
|                              | update     | newValue     | The new value being assigned.                                                                     | √                          | √                            |
|                              |            | oldValue     | The previous value of the observable.                                                             |                            |                              |

**Note:** object `update` events won't fire for updated computed values (as those aren't mutations). But it is possible to observe them by explicitly subscribing to the specific property using `observe(object, 'computedPropertyName', listener)`.
