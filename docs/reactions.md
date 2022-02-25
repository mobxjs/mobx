---
title: Running side effects with reactions
sidebar_label: Reactions {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Running side effects with reactions {🚀}

Reactions are an important concept to understand, as it is where everything in MobX comes together.
The goal of reactions is to model side effects that happen automatically.
Their significance is in creating consumers for your observable state and _automatically_ running side effects whenever something _relevant_ changes.

However, with that in mind, it is important to realize that the APIs discussed here should rarely be used.
They are often abstracted away in other libraries (like mobx-react) or abstractions specific to your application.

But, to grok MobX, let's take a look at how reactions can be created.
The simplest way is to use the [`autorun`](#autorun) utility.
Beyond that, there are also [`reaction`](#reaction) and [`when`](#when).

## Autorun

Usage:

-   `autorun(effect: (reaction) => void, options?)`

The `autorun` function accepts one function that should run every time anything it observes changes.
It also runs once when you create the `autorun` itself. It only responds to changes in observable state, things you have annotated `observable` or `computed`.

### How tracking works

Autorun works by running the `effect` in a _reactive context_. During the execution of the provided function, MobX keeps track of all observable and computed values that are directly or indirectly _read_ by the effect.
Once the function finishes, MobX will collect and subscribe to all observables that were read and wait until any of them changes again.
Once they do, the `autorun` will trigger again, repeating the entire process.

![autorun](assets/autorun.png)

This is how the example below works like.

### Example

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

Running this code, you will get the following output:

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

As you can see in the first two lines of the output above, both `autorun` functions run once when they are initialized. This is all you would see without the `for` loop.

Once we run the `for` loop to change the `energyLevel` with the `reduceEnergy`
action, we see a new log entry every time an `autorun` function observes a
change in its observable state:

1.  For the _"Energy level"_ function, this is every time the `energyLevel` observable changes, 10 times in total.

2.  For the _"Now I'm hungry"_ function, this is every time the `isHungry` computed
    changes, only one time.

## Reaction

Usage:

-   `reaction(() => value, (value, previousValue, reaction) => { sideEffect }, options?)`.

`reaction` is like `autorun`, but gives more fine grained control on which observables will be tracked.
It takes two functions: the first, _data_ function, is tracked and returns the data that is used as input for the second, _effect_ function.
It is important to note that the side effect _only_ reacts to data that was _accessed_ in the data function, which might be less than the data that is actually used in the effect function.

The typical pattern is that you produce the things you need in your side effect
in the _data_ function, and in that way control more precisely when the effect triggers.
By default, the result of the _data_ function has to change in order for the _effect_ function to be triggered.
Unlike `autorun`, the side effect won't run once when initialized, but only after the data expression returns a new value for the first time.

<details id="reaction-example"><summary>**Example:** the data and effect functions<a href="#reaction-example" class="tip-anchor"></a></summary>

In the example below, the reaction is only triggered once, when `isHungry` changes.
Changes to `giraffe.energyLevel`, which is used by the _effect_ function, do not cause the _effect_ function to be executed. If you wanted `reaction` to respond to this
as well, you would have to also access it in the _data_ function and return it.

```javascript
import { makeAutoObservable, reaction } from "mobx"

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

Output:

```
Now let's change state!
Now I'm hungry!
Energy level: 40
```

</details>

## When

Usage:

-   `when(predicate: () => boolean, effect?: () => void, options?)`
-   `when(predicate: () => boolean, options?): Promise`

`when` observes and runs the given _predicate_ function until it returns `true`.
Once that happens, the given _effect_ function is executed and the autorunner is disposed.

The `when` function returns a disposer, allowing you to cancel it manually, unless you don't pass in a second `effect` function, in which case it returns a `Promise`.

<details id="when-example">
  <summary>**Example:** dispose of things in a reactive way<a href="#when-example" class="tip-anchor"></a></summary>

`when` is really useful for disposing or canceling of things in a reactive way.
For example:

```javascript
import { when, makeAutoObservable } from "mobx"

class MyResource {
    constructor() {
        makeAutoObservable(this, { dispose: false })
        when(
            // Once...
            () => !this.isVisible,
            // ... then.
            () => this.dispose()
        )
    }

    get isVisible() {
        // Indicate whether this item is visible.
    }

    dispose() {
        // Clean up some resources.
    }
}
```

As soon as `isVisible` becomes `false`, the `dispose` method is called that
then does some cleanup for `MyResource`.

</details>

### `await when(...)`

If no `effect` function is provided, `when` returns a `Promise`. This combines nicely with `async / await` to let you wait for changes in observable state.

```javascript
async function() {
	await when(() => that.isVisible)
	// etc...
}
```

To cancel `when` prematurely, it is possible to call `.cancel()` on the promise returned by itself.

## Rules

There are a few rules that apply to any reactive context:

1. Affected reactions run by default immediately (synchronously) if an observable is changed. However, they won't run before the end of the current outermost (trans)action.
2. Autorun tracks only the observables that are read during the synchronous execution of the provided function, but it won't track anything that happens asynchronously.
3. Autorun won't track observables that are read by an action invoked by the autorun, as actions are always _untracked_.

For more examples on what precisely MobX will and will not react to, check out the [Understanding reactivity](understanding-reactivity.md) section.
For a more detailed technical breakdown on how tracking works, read the blog post [Becoming fully reactive: an in-depth explanation of MobX](https://hackernoon.com/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).

## Always dispose of reactions

The functions passed to `autorun`, `reaction` and `when` are only garbage collected if all objects they observe are garbage collected themselves. In principle, they keep waiting forever for new changes to happen in the observables they use.
To be able to stop them from waiting until forever has passed, they all return a disposer function that can be used to stop them and unsubscribe from any observables they used.

```javascript
const counter = observable({ count: 0 })

// Sets up the autorun and prints 0.
const disposer = autorun(() => {
    console.log(counter.count)
})

// Prints: 1
counter.count++

// Stops the autorun.
disposer()

// Will not print.
counter.count++
```

We strongly recommend to always use the disposer function that is returned from these methods as soon as their side effect is no longer needed.
Failing to do so can lead to memory leaks.

The `reaction` argument that is passed as second argument to the effect functions of `reaction` and `autorun`, can be used to prematurely clean up the reaction as well by calling `reaction.dispose()`.

<details id="mem-leak-example"><summary>**Example:** memory leak<a href="#mem-leak-example" class="tip-anchor"></a></summary>

```javascript
class Vat {
    value = 1.2

    constructor() {
        makeAutoObservable(this)
    }
}

const vat = new Vat()

class OrderLine {
    price = 10
    amount = 1
    constructor() {
        makeAutoObservable(this)

        // This autorun will be GC-ed together with the current orderline
        // instance as it only uses observables from `this`. It's not strictly
        // necessary to dispose of it once an OrderLine instance is deleted.
        this.disposer1 = autorun(() => {
            doSomethingWith(this.price * this.amount)
        })

        // This autorun won't be GC-ed together with the current orderline
        // instance, since vat keeps a reference to notify this autorun, which
        // in turn keeps 'this' in scope.
        this.disposer2 = autorun(() => {
            doSomethingWith(this.price * this.amount * vat.value)
        })
    }

    dispose() {
        // So, to avoid subtle memory issues, always call the
        // disposers when the reactions are no longer needed.
        this.disposer1()
        this.disposer2()
    }
}
```

</details>

## Use reactions sparingly!

As it was already said, you won't create reactions very often.
It might very well be that your application doesn't use any of these APIs directly, and the only way reactions are constructed is indirectly, through for example `observer` from the mobx-react bindings.

Before you set up a reaction, it is good to first check if it conforms to the following principles:

1. **Only use Reactions if there is no direct relation between cause and effect**: If a side effect should happen in response to a very limited set of events / actions, it will often be clearer to directly trigger the effect from those specific actions. For example, if pressing a form submit button should lead to a network request to be posted, it is clearer to trigger this effect directly in response of the `onClick` event, rather than indirectly through a reaction. In contrast, if any change you make to the form state should automatically end up in local storage, then a reaction can be very useful, so that you don't have to trigger this effect from every individual `onChange` event.
1. **Reactions shouldn't update other observables**: Is the reaction going to modify other observables? If the answer is yes, typically the observable you want to update should be annotated as a [`computed`](computeds.md) value instead. For example, if a collection of todos is altered, don't use a reaction to compute the amount of `remainingTodos`, but annotate `remainingTodos` as a computed value. That will lead to much clearer and easier to debug code. Reactions should not compute new data, but only cause effects.
1. **Reactions should be independent**: Does your code rely on some other reaction having to run first? If that is the case, you probably
   either violated the first rule, or the new reaction you are about to create should be merged into the one it is depending upon. MobX does not guarantee the order in which reactions will be run.

There are real-life scenarios that do not fit in the above principles. That is why they are _principles_, not _laws_.
But, the exceptions are rare so only violate them as a last resort.

## Options {🚀}

The behavior of `autorun`, `reaction` and `when` can be further fine-tuned by passing in an `options` argument as shown in the usages above.

### `name`

This string is used as a debug name for this reaction in the [Spy event listeners](analyzing-reactivity.md#spy) and [MobX developer tools](https://github.com/mobxjs/mobx-devtools).

### `fireImmediately` _(reaction)_

Boolean indicating that the _effect_ function should immediately be triggered after the first run of the _data_ function. `false` by default.

### `delay` _(autorun, reaction)_

Number of milliseconds that can be used to throttle the effect function. If zero (default), no throttling happens.

### `timeout` _(when)_

Set a limited amount of time that `when` will wait for. If the deadline passes, `when` will reject / throw.

### `onError`

By default, any exception thrown inside an reaction will be logged, but not further thrown. This is to make sure that an exception in one reaction does not prevent the scheduled execution of other, possibly unrelated reactions. This also allows reactions to recover from exceptions. Throwing an exception does not break the tracking done by MobX, so subsequent runs of the reaction might complete normally again if the cause for the exception is removed. This option allows overriding that behavior. It is possible to set a global error handler or to disable catching errors completely using [configure](configuration.md#disableerrorboundaries-boolean).

### `scheduler` _(autorun, reaction)_

Set a custom scheduler to determine how re-running the autorun function should be scheduled. It takes a function that should be invoked at some point in the future, for example: `{ scheduler: run => { setTimeout(run, 1000) }}`

### `equals`: (reaction)

Set to `comparer.default` by default. If specified, this comparer function is used to compare the previous and next values produced by the _data_ function. The _effect_ function is only invoked if this function returns false.

Check out the [Built-in comparers](computeds.md#built-in-comparers) section.
