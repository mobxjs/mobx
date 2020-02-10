---
title: The gist of MobX
sidebar_label: The gist of MobX
hide_title: true
---

# The gist of MobX

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 1: observable & observer</summary>
    <br />
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;" href="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react">Hosted on egghead.io</a>
</details>

So far it all might sound a bit fancy, but making an app reactive using MobX boils down to just these three steps:

## 1. Define your state and make it observable

Store state in any data structure you like; objects, array, classes.
Cyclic data structures, references, it doesn't matter.
Just make sure that all properties that you want to change over time are marked by `mobx` to make them observable.

```javascript
import { observable } from "mobx"

var appState = observable({
    timer: 0
})
```

## 2. Create a view that responds to changes in the State

We didn't make our `appState` observable for nothing;
you can now create views that automatically update whenever relevant data in the `appState` changes.
MobX will find the minimal way to update your views.
This single fact saves you tons of boilerplate and is [wickedly efficient](https://mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

Generally speaking any function can become a reactive view that observes its data, and MobX can be applied in any ES5 conformant JavaScript environment.
But here is an (ES6) example of a view in the form of a React component.

```javascript
import { observer } from "mobx-react"

@observer
class TimerView extends React.Component {
    render() {
        return (
            <button onClick={this.onReset.bind(this)}>
                Seconds passed: {this.props.appState.timer}
            </button>
        )
    }

    onReset() {
        this.props.appState.resetTimer()
    }
}

ReactDOM.render(<TimerView appState={appState} />, document.body)
```

(For the implementation of `resetTimer` function see the next section)

## 3. Modify the State

The third thing to do is to modify the state.
That is what your app is all about after all.
Unlike many other frameworks, MobX doesn't dictate how you do this.
There are best practices, but the key thing to remember is:
**_MobX helps you do things in a simple straightforward way_**.

The following code will alter your data every second, and the UI will update automatically when needed.
No explicit relations are defined in either the controller functions that _change_ the state or in the views that should _update_.
Decorating your _state_ and _views_ with `observable` is enough for MobX to detect all relationships.
Here are two examples of changing the state:

```javascript
appState.resetTimer = action(function reset() {
    appState.timer = 0
})

setInterval(
    action(function tick() {
        appState.timer += 1
    }),
    1000
)
```

The `action` wrapper is only needed when using MobX in strict mode (by default off).
It is recommended to use action though as it will help you to better structure applications and expresses the intention of a function to modify state.
Also it automatically applies transactions for optimal performance.

Feel free to try this example on [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/) or by cloning the [MobX boilerplate project](https://github.com/mobxjs/mobx-react-boilerplate)
