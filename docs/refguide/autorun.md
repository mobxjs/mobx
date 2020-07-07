---
title: autorun
sidebar_label: autorun
hide_title: true
---

# Autorun

Usage:

-   `autorun(effect: (reaction) => void)`

You pass a function into `autorun` that should run each time anything it observes changes. It also runs once when you create the `autorun`. It only responds to changes in observable state -- so things you marked `observable` or `computed`. It won't
respond if other observable state changes that it does not in any refer refer
to in the function.

Here's an example:

```javascript
import { makeAutoObservable, autorun } from "mobx"

class Animal {
    name
    energyLevel

    constructor(name) {
        this.name = name
        this.energyLevel = 100
        makeAutoObservable(this)
    }

    reduceEnergy() {
        this.energyLevel -= 10
    }

    get isHungry() {
        return this.energyLevel < 50
    }
}

const giraffe = new Animal("Gary")

autorun(() => {
    console.log("Energy level:", giraffe.energyLevel)
})

autorun(() => {
    if (giraffe.isHungry) {
        console.log("Now I'm hungry!")
    } else {
        console.log("I'm not hungry!")
    }
})

console.log("Now let's change state!")
for (let i = 0; i < 10; i++) {
    giraffe.reduceEnergy()
}
```

When you run this code, you get the following output:

```
Energy level: 100
I'm not hungry!
Now let's change state!
Energy level: 90
Energy level: 80
Energy level: 70
Energy level: 60
Energy level: 50
Energy level: 40
Now I'm hungry!
Energy level: 30
Energy level: 20
Energy level: 10
Energy level: 0
```

As you can see, both `autorun` functions run once when they are initialized --
this is all you would see without the `for` loop. This accounts for the
first two lines of the output.

Once we run the `for` loop to change the `energyLevel` with the `reduceEnergy`
action we see a new log entry each time an `autorun` function observes a
change to its observable state:

-   For the "Energy level" function this is each time the observable property `energyLevel` changes, so 10 times.

-   For the "Now I'm hungry" function it's each time the `isHungry` computed
    changes; so only once.

Compare this with [reaction](reaction.md), which offers more fine-grained control over when the effect runs.

## When to use `autorun`

`autorun` is useful when you need to bridge from reactive to imperative code, for
example for logging, persistence, or UI-updating code. It should not be used to update state that can be derived from other observables; use [`computed`](computed.md) for that.

If you use React, it's like the [`observer` function](../react/react-integration.md); `autorun` only observes data that is used during the execution of the provided function.

It can be used in those cases where you want to create a reactive function that will never have observers itself.

In contrast, [`computed`](computed.md) creates a function that only re-evaluates if it it itself being observed, otherwise its value is considered to be irrelevant.
As a rule of thumb: use `autorun` if you have a function that should run automatically but that doesn't result in a new value.
Use `computed` for everything else. Autoruns are about initiating _effects_, not about producing new values.

## Debug name

If a string is passed as first argument to `autorun`, it will be used as debug name.

## Disposing of autorun

The return value from autorun is a disposer function, which can be used to dispose of the autorun when you no longer need it:

```javascript
const disposer = autorun(() => {
    /* do some stuff */
})
disposer()
```

The reaction itself is also passed as the only argument to the function given to autorun, which allows you to manipulate it from within the autorun function. This
gives you another way to dispose of the autorun:

```javascript
autorun(reaction => {
    /* do some stuff */
    reaction.dispose()
})
```

[Read more about why it's important to dispose](../best/dispose-reactions).

## Options

Autorun accepts an object as the last argument with the following optional options:

-   `delay`: Number in milliseconds that can be used to throttle the effect function. If zero (the default), no throttling happens.
-   `name`: String that is used as name for this reaction in for example [`spy`](spy.md) events.
-   `onError`: function that will handle the errors of this reaction, rather than propagating them.
-   `scheduler`: Set a custom scheduler to determine how re-running the autorun function should be scheduled. It takes a function that should be invoked at some point in the future, for example: `{ scheduler: run => { setTimeout(run, 1000) }}`

## The `delay` option

```javascript
autorun(
    () => {
        // Assuming that profile.asJson returns an observable Json representation of profile,
        // send it to the server each time it is changed, but await at least 300 milliseconds before sending it.
        // When sent, the latest value of profile.asJson will be used.
        sendProfileToServer(profile.asJson)
    },
    { delay: 300 }
)
```

## The `onError` option

Exceptions thrown in autorun and all other types reactions are caught and logged to the console, but not propagated back to the original causing code.
This is to make sure that an exception in one reaction does not prevent the scheduled execution of other, possibly unrelated, reactions.
This also allows reactions to recover from exceptions; throwing an exception does not break the tracking done by MobX, so as subsequent run of a reaction might complete normally again if the cause for the exception is removed.

It is possible to override the default logging behavior of Reactions by providing the `onError` option. For example:

```javascript
import { makeAutoObservable, autorun } from "mobx"

class Person {
    age

    constructor(age) {
        this.age = age
        makeAutoObservable(this)
    }
}

const person = new Person(10)

const dispose = autorun(
    () => {
        if (person.age. < 0) {
            throw new Error("Age should not be negative")
        }
        console.log("Age", person.age)
    },
    {
        onError(e) {
            window.alert("Please enter a valid age")
        }
    }
)
```

A global `onError` handler can be set as well with `onReactionError(handler)`. This can be useful in tests or for client side error monitoring.
