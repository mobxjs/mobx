---
title: The gist of MobX
sidebar_label: The gist of MobX
hide_title: true
---

# The gist of MobX

So far it all might sound a bit fancy, but making an app reactive using MobX boils down to just these three steps:

## 1. Define your state and make it observable

Store state in any data structure you like; objects, array, classes.
Cyclic data structures, references, it doesn't matter.
Just make sure that all properties that you want to change over time are marked by MobX to make them observable.

```javascript
import { makeAutoObservable } from "mobx"

class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }
}

const myTimer = new Timer()
```

## 2. Create a view that responds to changes in the State

We didn't make our `Timer` observable for nothing;
you can now create views that automatically update whenever relevant data in a `Timer` instance changes.
MobX will find the minimal way to update your views.
This single fact saves you tons of boilerplate and is [wickedly efficient](https://mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

Generally speaking any function can become a reactive view that observes its data, and MobX can be applied in any ES5 conformant JavaScript environment.
But here is an (ES6) example of a view in the form of a React component.

```javascript
import * as React from "react"
import { render } from "react-dom"
import { observer } from "mobx-react-lite"

const TimerView = observer(({ timer }) => (
    <button onClick={() => timer.resetTimer()}>Seconds passed: {timer.secondsPassed}</button>
))
render(<TimerView timer={myTimer} />, document.getElementById("root"))
```

(For the implementation of `resetTimer` method see the next section)

## 3. Modify the State

The third thing to do is to modify the state.
That is what your app is all about after all.

Let's alter the timer every second, and see that the UI will update automatically when needed. Let's also implement that `resetTimer` method.

Here's the new `Timer` model with a few methods added that modify state:

```javascript
import { makeAutoObservable } from "mobx"

class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increaseTimer() {
        this.secondsPassed += 1
    }

    resetTimer() {
        this.secondsPassed = 0
    }
}

const myTimer = new Timer()

setInterval(() => {
    myTimer.increaseTimer()
}, 1000)
```

These methods, `increaseTimer` and `resetTimer` are just like you would write them without MobX. You can use them anywhere -- from React event handlers or in `setInterval`, for instance.
Notice that making updates asynchronously doesn't require any special wiring; since MobX is a \_re_active system, it doesn't matter how or even when state updates are triggered; the reactivity system will propagate changes in any case.

**_MobX helps you do things in a simple straightforward way_**.

Feel free to try this example on [CodeSandbox](https://codesandbox.io/s/the-gist-of-mobx-piqqp?file=/src/index.js).

To learn more about the concepts and principles underlying MobX, together with a more worked out example, read [Concepts & Principles](concepts.md). To learn more
about how to use MobX with React, read [React integration](../react/react-integration.md).
