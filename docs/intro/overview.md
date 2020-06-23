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
Just make sure that all properties that you want to change over time are marked by `mobx` to make them observable.

```javascript
import { makeObservable, observable } from "mobx"

class AppState {
    timer = 0

    constructor() {
        makeObservable(this, {
            timer: observable
        })
    }
}

const appState = new AppState()
```

## 2. Create a view that responds to changes in the State

We didn't make our `AppState` observable for nothing;
you can now create views that automatically update whenever relevant data in the `appState` changes.
MobX will find the minimal way to update your views.
This single fact saves you tons of boilerplate and is [wickedly efficient](https://mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

Generally speaking any function can become a reactive view that observes its data, and MobX can be applied in any ES5 conformant JavaScript environment.
But here is an (ES6) example of a view in the form of a React component.

```javascript
import { observer } from "mobx-react"

const TimerView = observer(({ appState }) => (
    <button onClick={() => appState.resetTimer()}>Seconds passed: {appState.timer}</button>
))
ReactDOM.render(<TimerView appState={appState} />, document.body)
```

(For the implementation of `resetTimer` method see the next section)

## 3. Modify the State

The third thing to do is to modify the state.
That is what your app is all about after all.

Let's alter the timer every second, and see that the UI will update automatically when needed. Let's also implement that `resetTimer` method.

Here's the new `AppState` model with a few methods added that modify state:

```javascript
import { makeObservable, observable, action } from "mobx"

class AppState {
    timer = 0

    constructor() {
        makeObservable(this, {
            timer: observable,
            resetTimer: action,
            increaseTimer: action
        })
    }

    increaseTimer() {
        this.timer += 1
    }

    resetTimer() {
        this.timer = 0
    }
}

setInterval(() => {
    appState.increaseTimer()
}, 1000)

const appState = new AppState()
```

These methods, `increaseTimer` and `resetTimer` are just like you would write them without MobX. You can use them anywhere -- from React event handlers or in `setInterval`, for instance. The only thing you need to do is to mark them as `action` with `makeObservable`. By marking methods this way you make MobX automatically
apply transactions for optimal performance.

**_MobX helps you do things in a simple straightforward way_**.

Feel free to try this example on [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/) or by cloning the [MobX boilerplate project](https://github.com/mobxjs/mobx-react-boilerplate)
