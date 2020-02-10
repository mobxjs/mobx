---
title: reaction
sidebar_label: reaction
hide_title: true
---

# Reaction

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Usage: `reaction(() => data, (data, reaction) => { sideEffect }, options?)`.

A variation on `autorun` that gives more fine grained control on which observables will be tracked.
It takes two functions, the first one (the _data_ function) is tracked and returns data that is used as input for the second one, the _effect_ function.
Unlike `autorun` the side effect won't be run directly when created, but only after the data expression returns a new value for the first time.
Any observables that are accessed while executing the side effect will not be tracked.

`reaction` returns a disposer function.

The second function (the _effect_ function) passed to `reaction` will receive two arguments when invoked.
The first argument is the value returned by the _data_ function. The second argument is the current reaction,
which can be used to dispose the `reaction` during execution.

It is important to notice that the side effect will _only_ react to data that was _accessed_ in the data expression, which might be less than the data that is actually used in the effect.
Also, the side effect will only be triggered when the data returned by the expression has changed.
In other words: reaction requires you to produce the things you need in your side effect.

## Options

Reaction accepts a third argument as an options object with the following optional options:

-   `fireImmediately`: Boolean that indicates that the effect function should immediately be triggered after the first run of the data function. `false` by default.
-   `delay`: Number in milliseconds that can be used to debounce the effect function. If zero (the default), no debouncing will happen.
-   `equals`: `comparer.default` by default. If specified, this comparer function will be used to compare the previous and next values produced by the _data_ function. The _effect_ function will only be invoked if this function returns false. If specified, this will override `compareStructural`.
-   `name`: String that is used as name for this reaction in for example [`spy`](spy.md) events.
-   `onError`: function that will handle the errors of this reaction, rather then propagating them.
-   `scheduler`: Set a custom scheduler to determine how re-running the autorun function should be scheduled

## Example

In the following example both `reaction1`, `reaction2` and `autorun1` will react to the addition, removal or replacement of todo's in the `todos` array.
But only `reaction2` and `autorun` will react to the change of a `title` in one of the todo items, because `title` is used in the data expression of reaction 2, while it isn't in the data expression of reaction 1.
`autorun` tracks the complete side effect, hence it will always trigger correctly, but is also more suspectible to accidentally accessing unrelevant data.
See also [what will MobX React to?](../best/react).

```javascript
const todos = observable([
    {
        title: "Make coffee",
        done: true
    },
    {
        title: "Find biscuit",
        done: false
    }
])

// wrong use of reaction: reacts to length changes, but not to title changes!
const reaction1 = reaction(
    () => todos.length,
    length => console.log("reaction 1:", todos.map(todo => todo.title).join(", "))
)

// correct use of reaction: reacts to length and title changes
const reaction2 = reaction(
    () => todos.map(todo => todo.title),
    titles => console.log("reaction 2:", titles.join(", "))
)

// autorun reacts to just everything that is used in its function
const autorun1 = autorun(() => console.log("autorun 1:", todos.map(todo => todo.title).join(", ")))

todos.push({ title: "explain reactions", done: false })
// prints:
// reaction 1: Make coffee, find biscuit, explain reactions
// reaction 2: Make coffee, find biscuit, explain reactions
// autorun 1: Make coffee, find biscuit, explain reactions

todos[0].title = "Make tea"
// prints:
// reaction 2: Make tea, find biscuit, explain reactions
// autorun 1: Make tea, find biscuit, explain reactions
```

In the following example `reaction3`, will react to the change in the `counter` count.
When invoked `reaction`, second argument can use as disposer.
The following example shows a `reaction` that is invoked only once.

```javascript
const counter = observable({ count: 0 })

// invoke once of and dispose reaction: reacts to observable value.
const reaction3 = reaction(
    () => counter.count,
    (count, reaction) => {
        console.log("reaction 3: invoked. counter.count = " + count)
        reaction.dispose()
    }
)

counter.count = 1
// prints:
// reaction 3: invoked. counter.count = 1

counter.count = 2
// prints:
// (There are no logging, because of reaction disposed. But, counter continue reaction)

console.log(counter.count)
// prints:
// 2
```

Reaction is roughly speaking sugar for: `computed(expression).observe(action(sideEffect))` or `autorun(() => action(sideEffect)(expression))`
