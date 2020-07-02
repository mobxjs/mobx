---
title: reaction
sidebar_label: reaction
hide_title: true
---

# Reaction

Usage: `reaction(() => data, (data, reaction) => { sideEffect }, options?)`.

`reaction` is like [`autorun`](autorun.md) but gives more fine grained control on which observables will be tracked.
It takes two functions, the first one (the _data_ function) is tracked and returns data that is used as input for the second one, the _effect_ function.
It is important to notice that the side effect _only_ reacts to data that was _accessed_ in the data expression, which might be less than the data that is actually used in the effect. In other words: only observables accessed by the _data_ function are tracked; observables that are accessed while executing the _effect_ function are not.

Unlike `autorun` the side effect won't be run directly when created, but only after the data expression returns a new value for the first time.

The _effect_ function passed to `reaction` receives the value returned by the _data_ function as its first argument.

The typical pattern is that you produce the things you need in your side effect
in the _data_ function, because is only be triggered when the data returned by the expression has changed.

Here is an example:

```javascript
import { makeAutoObservable, reaction } from "mobx"

class Animal {
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

reaction(
    () => giraffe.isHungry,
    isHungry => {
        if (isHungry) {
            console.log("Now I'm hungry!")
        } else {
            console.log("I'm not hungry!")
        }
        console.log("Energy level:", giraffe.energyLevel)
    }
)

console.log("Now let's change state!")
for (let i = 0; i < 10; i++) {
    giraffe.reduceEnergy()
}
```

The output of this example is:

```
Now let's change state!
Now I'm hungry!
Energy level: 40
```

As you can see, this reaction is only triggered once, when `isHungry` changes.
Changes to `giraffe.energyLevel`, which the _effect_ function only uses, do not cause the _effect_ function to be executed. If you wanted `reaction` to respond to this
as well, you would have to also access it in the _data_ function and return it.

Compare this with the example given for [autorun](autorun.md).

## Disposing of reaction

Like with `autorun`, the return value is a disposer function:

```javascript
const disposer = reaction(
    () => {
        /* return data */
    },
    data => {
        /* do some stuff */
    }
)
disposer()
```

You can also access the reaction itself as the second argument:

The reaction itself is also passed as the second argument to the _effect_ function,
so this gives you another way to dispose of the reaction:

```javascript
const disposer = reaction(
    () => {
        /* return data */
    },
    (data, reaction) => {
        /* do some stuff */
        reaction.dispose()
    }
)
```

## Options

Reaction accepts a third argument as an options object with the following optional options:

-   `fireImmediately`: Boolean that indicates that the _effect_ function should immediately be triggered after the first run of the _data_ function. `false` by default.
-   `delay`: Number in milliseconds that can be used to throttle the _effect_ function. If zero (the default), no throttling happens.
-   `equals`: `comparer.default` by default. If specified, this comparer function is used to compare the previous and next values produced by the _data_ function. The _effect_ function is only invoked if this function returns false. If specified, this overrides `compareStructural`.
-   `name`: String that is used as name for this reaction in for example [`spy`](spy.md) events.
-   `onError`: function that handles the errors of this reaction, rather than propagating them.
-   `scheduler`: Set a custom scheduler to determine how re-running the autorun function should be scheduled

## Behavior

Reaction is roughly speaking sugar for:

```javascript
computed(expression).observe(action(sideEffect))
```

or

```javascript
autorun(() => action(sideEffect)(expression))
```
