---
title: autorun
sidebar_label: autorun
hide_title: true
---

# Autorun

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 9: custom reactions</summary>
    <br>
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/react-write-custom-mobx-reactions-with-when-and-autorun/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/react-write-custom-mobx-reactions-with-when-and-autorun">Hosted on egghead.io</a>
</details>

`mobx.autorun` can be used in those cases where you want to create a reactive function that will never have observers itself.
This is usually the case when you need to bridge from reactive to imperative code, for example for logging, persistence, or UI-updating code.
When `autorun` is used, the provided function will always be triggered once immediately and then again each time one of its dependencies changes.
In contrast, `computed(function)` creates functions that only re-evaluate if it has
observers on its own, otherwise its value is considered to be irrelevant.
As a rule of thumb: use `autorun` if you have a function that should run automatically but that doesn't result in a new value.
Use `computed` for everything else. Autoruns are about initiating _effects_, not about producing new values.
If a string is passed as first argument to `autorun`, it will be used as debug name.

The return value from autorun is a disposer function, which can be used to dispose of the autorun when you no longer need it. The reaction itself will also be passed as the only argument to the function given to autorun, which allows you to manipulate it from within the autorun function. This means there are two ways you can dispose of the reaction when you no longer need it:

```javascript
const disposer = autorun(reaction => {
    /* do some stuff */
})
disposer()

// or

autorun(reaction => {
    /* do some stuff */
    reaction.dispose()
})
```

Just like the [`@observer` decorator/function](./observer-component.md), `autorun` will only observe data that is used during the execution of the provided function.

```javascript
var numbers = observable([1, 2, 3])
var sum = computed(() => numbers.reduce((a, b) => a + b, 0))

var disposer = autorun(() => console.log(sum.get()))
// prints '6'
numbers.push(4)
// prints '10'

disposer()
numbers.push(5)
// won't print anything, nor is `sum` re-evaluated
```

## Options

Autorun accepts as the second argument an options object with the following optional options:

-   `delay`: Number in milliseconds that can be used to debounce the effect function. If zero (the default), no debouncing will happen.
-   `name`: String that is used as name for this reaction in for example [`spy`](spy.md) events.
-   `onError`: function that will handle the errors of this reaction, rather then propagating them.
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
This is to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions.
This also allows reactions to recover from exceptions; throwing an exception does not break the tracking done by MobX,
so as subsequent run of a reaction might complete normally again if the cause for the exception is removed.

It is possible to override the default logging behavior of Reactions by providing the `onError` option
Example:

```javascript
const age = observable.box(10)

const dispose = autorun(
    () => {
        if (age.get() < 0) throw new Error("Age should not be negative")
        console.log("Age", age.get())
    },
    {
        onError(e) {
            window.alert("Please enter a valid age")
        }
    }
)
```

A global onError handler can be set as well, use `onReactionError(handler)`. This can be useful in tests or for client side error monitoring.
