---
sidebar_label: intercept & observe
title: Intercept & Observe
hide_title: true
---

# Intercept & Observe

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

`observe` and `intercept` can be used to monitor the changes of a single observable (they **_don't_** track nested observables).
`intercept` can be used to detect and modify mutations before they are applied to the observable.
`observe` allows you to intercept changes after they have been made.

## Intercept

Usage: `intercept(target, propertyName?, interceptor)`

-   `target`: the observable to guard
-   `propertyName`: optional parameter to specify a specific property to intercept. Note that `intercept(user.name, interceptor)` is fundamentally different from `intercept(user, "name", interceptor)`. The first tries to add an interceptor to the _current_ `value` inside `user.name` (which might not be an observable at all), the latter intercepts changes to the `name` _property_ of `user`.
-   `interceptor`: callback that will be invoked for _each_ change that is made to the observable. Receives a single change object describing the mutation.

The `intercept` should tell MobX what needs to happen with the current change.
Therefore it should do one of the following things:

1. Return the received `change` object as-is from the function, in which case the mutation will be applied.
2. Modify the `change` object and return it, for example to normalize the data. Not all fields are modifiable, see below.
3. Return `null`, this indicates that the change can be ignored and shouldn't be applied. This is a powerful concept to make your objects for example temporarily immutable.
4. Throw an exception, for example if some invariant isn't met.

The function returns a `disposer` function that can be used to cancel the interceptor when invoked.
It is possible to register multiple interceptors to the same observable.
They will be chained in registration order.
If one of the interceptors returns `null` or throw an exception, the other interceptors won't be evaluated anymore.
It is also possible to register an interceptor both on a parent object and on an individual property.
In that case the parent object interceptors are run before the property interceptors.

```javascript
const theme = observable({
    backgroundColor: "#ffffff"
})

const disposer = intercept(theme, "backgroundColor", change => {
    if (!change.newValue) {
        // ignore attempts to unset the background color
        return null
    }
    if (change.newValue.length === 6) {
        // correct missing '#' prefix
        change.newValue = "#" + change.newValue
        return change
    }
    if (change.newValue.length === 7) {
        // this must be a properly formatted color code!
        return change
    }
    if (change.newValue.length > 10) disposer() // stop intercepting future changes
    throw new Error("This doesn't like a color at all: " + change.newValue)
})
```

## Observe

Usage: `observe(target, propertyName?, listener, invokeImmediately?)`

-   `target`: the observable to observe
-   `propertyName`: optional parameter to specify a specific property to observe. Note that `observe(user.name, listener)` is fundamentally different from `observe(user, "name", listener)`. The first observes the _current_ `value` inside `user.name` (which might not be an observable at all), the latter observes the `name` _property_ of `user`.
-   `listener`: callback that will be invoked for _each_ change that is made to the observable. Receives a single change object describing the mutation, except for boxed observables, which will invoke the `listener` two parameters: `newValue, oldValue`.
-   `invokeImmediately`: by default false. Set it to true if you want `observe` to invoke `listener` directly with the state of the observable (instead of waiting for the first change). Not supported (yet) by all kinds of observables.

The function returns a `disposer` function that can be used to cancel the observer.
Note that `transaction` does not affect the working of the `observe` method(s).
This means that even inside a transaction `observe` will fire its listeners for each mutation.
Hence `autorun` is usually a more powerful and declarative alternative to `observe`.

_`observe` reacts to *mutations*, when they are being made, while reactions like `autorun` or `reaction` react to *new values* when they become available. In many cases the latter is sufficient_

Example:

```javascript
import { observable, observe } from "mobx"

const person = observable({
    firstName: "Maarten",
    lastName: "Luther"
})

const disposer = observe(person, change => {
    console.log(change.type, change.name, "from", change.oldValue, "to", change.object[change.name])
})

person.firstName = "Martin"
// Prints: 'update firstName from Maarten to Martin'

disposer()
// Ignore any future updates

// observe a single field
const disposer2 = observe(person, "lastName", change => {
    console.log("LastName changed to ", change.newValue)
})
```

Related blog: [Object.observe is dead. Long live mobx.observe](https://medium.com/@mweststrate/object-observe-is-dead-long-live-mobservable-observe-ad96930140c5)

## Event overview

The callbacks of `intercept` and `observe` will receive an event object which has at least the following properties:

-   `object`: the observable triggering the event
-   `type`: (string) the type of the current event

These are the additional fields that are available per type:

| observable type              | event type | property     | description                                                                                      | available during intercept | can be modified by intercept |
| ---------------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------- |
| Object                       | add        | name         | name of the property being added                                                                 | √                          |                              |
|                              |            | newValue     | the new value being assigned                                                                     | √                          | √                            |
|                              | update\*   | name         | name of the property being updated                                                               | √                          |                              |
|                              |            | newValue     | the new value being assigned                                                                     | √                          | √                            |
|                              |            | oldValue     | the value that is replaced                                                                       |                            |                              |
| Array                        | splice     | index        | starting index of the splice. Splices are also fired by `push`, `unshift`, `replace` etc.        | √                          |                              |
|                              |            | removedCount | amount of items being removed                                                                    | √                          | √                            |
|                              |            | added        | array with items being added                                                                     | √                          | √                            |
|                              |            | removed      | array with items that were removed                                                               |                            |                              |
|                              |            | addedCount   | amount of items that were added                                                                  |                            |                              |
|                              | update     | index        | index of the single entry that is being updated                                                  | √                          |                              |
|                              |            | newValue     | the newValue that is / will be assigned                                                          | √                          | √                            |
|                              |            | oldValue     | the old value that was replaced                                                                  |                            |                              |
| Map                          | add        | name         | the name of the entry that was added                                                             | √                          |                              |
|                              |            | newValue     | the new value that is being assigned                                                             | √                          | √                            |
|                              | update     | name         | the name of the entry that is being updated                                                      | √                          |                              |
|                              |            | newValue     | the new value that is being assigned                                                             | √                          | √                            |
|                              |            | oldValue     | the value that has been replaced                                                                 |                            |                              |
|                              | delete     | name         | the name of the entry that is being removed                                                      | √                          |                              |
|                              |            | oldValue     | the value of the entry that was removed                                                          |                            |                              |
| Boxed & computed observables | create     | newValue     | the value that was assigned during creation. Only available as `spy` event for boxed observables |                            |                              |
|                              | update     | newValue     | the new value being assigned                                                                     | √                          | √                            |
|                              |            | oldValue     | the previous value of the observable                                                             |                            |                              |

_\* Note that object `update` events won't fire for updated computated values (as those aren't mutations). But it is possible to observe them by explicitly subscribing to the specific property using `observe(object, 'computedPropertyName', listener)`._
