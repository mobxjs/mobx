---
title: React class components
sidebar_label: React class components
hide_title: true
---

# React class components

[React integration](react-integration.md) discusses the basic patterns for
using MobX with React function components. But MobX also works with React class components.

## Using `observer` with a class component

You can use `observer` with a class component just like you do with a function
component:

```javascript
import React from "React"
import { observer } from "mobx-react"

const TimerView = observer(
    class TimerView extends React.Component {
        render() {
            const { timer } = this.props
            return <span>Seconds passed: {timer.secondsPassed} </span>
        }
    }
)
```

## Local observable state in class based components

Just like normal classes, you can introduce observable properties on a component by using `makeObservable`. For example:

```javascript
import React from "React"
import { makeObservable, observable, action } from "mobx"
import { observer } from "mobx-react"

const TimerView = observer(
    class TimerView extends React.Component {
        secondsPassed = 0

        constructor(props) {
            super(props)
            makeObservable(this, { secondsPassed: observable })
        }

        componentWillMount() {
            setInterval(
                action(() => {
                    this.secondsPassed++
                }),
                1000
            )
        }

        render() {
            return <span>Seconds passed: {this.secondsPassed} </span>
        }
    }
)
```

For more advantages of using observable local component state, for class based components see [3 reasons why I stopped using `setState`](https://medium.com/@mweststrate/3-reasons-why-i-stopped-using-react-setstate-ab73fc67a42e).

The props object and the state object of an observer class component are automatically made observable to make it easier to create `computed` properties that derive from props inside such a component.

### Don't copy observable properties and store them locally

Observer components only track data that is accessed _during_ the render method. A common mistake is that data plucked of from an observable property and stored will for that reason not be tracked:

```javascript
import React from "React"
import { makeAutoObservable, makeObservable, observable, action } from "mobx"
import { observer } from "mobx-react"

class User {
    name

    constructor(name) {
        this.name = name
        makeAutoObservable(this)
    }
}

class Profile extends React.Component {
    componentWillMount() {
        // Wrong
        this.name = this.props.user.name
    }

    render() {
        return <div>{this.name}</div>
    }
}
```

This code won't work correctly, as you deference `user.name` and just copy the value once. Future updates will not be tracked, as lifecycle hooks are not reactive Assignments like these create redundant data.

The correct approach is either by not storing the values of observables locally (obviously, the above example is simple but contrived), or by defining them as computed property:

```javascript
class Profile extends React.Component {
    @computed get name() {
        // correct; computed property will track the `user.name` property
        return this.props.user.name
    }

    render() {
        return <div>{this.name}</div>
    }
}
```

## Using decorators

The previous example looks a bit cumbersome. We recommended switching class
components to function components if you can, and to use `useState` for maintaining
simple state.

[⚛️] But decorators are still supported -- here is the same example with
decorators:

```javascript
import React from "React"
import { makeObservable, observable, action } from "mobx"
import { observer } from "mobx-react"

@observer
class TimerView extends React.Component {
    @observable secondsPassed = 0

    constructor(props) {
        super(props)
        makeObservable(this)
    }

    @action
    increaseTimer() {
        this.secondsPassed += 1
    }

    componentWillMount() {
        setInterval(() => this.increaseTimer(), 1000)
    }

    render() {
        const { timer } = this.props
        return <span>Seconds passed: {timer.secondsPassed} </span>
    }
}
```

You can read more about [decorator support in MobX][../best/decorators.md],
including how to enable them.

### Don't mark (some) React lifecycle methods as `action.bound` on `observer` React components

[⚛️] If you modify any observable data in method in your React component, that method
should be marked as an `action`. For event handlers, `action.bound` is handy,
as `this` then refers to the instance your component class.

Now consider the following class:

```javascript
const ExampleComponent = observer(
    class ExampleComponent extends React.Component {
        disposer // <--- this value is disposed in addActed

        constructor(props) {
            super(props)
            makeObservable(this, {
                disposer: observable,
                addActed: action.bound,
                componentDidMount: action.bound
            })
        }

        addActed() {
            this.dispose()
        }

        componentDidMount() {
            this.disposer = this.observe()
        }

        observe() {
            return autoRun() // <-- details don't matter
        }
    }
)
```

If you call `addActed()` on a mounted `ExampleComponent`, the disposer is called.

On the other hand, consider the following:

```javascript
const ExampleComponent = observer(
    class ExampleComponent extends React.Component {
        disposer // <--- this value is disposed in componentWillMount

        constructor(props) {
            super(props)
            makeObservable(this, {
                disposer: observable,
                componentWillMOunt: action.bound,
                componentDidMount: action.bound
            })
        }

        @action.bound
        componentWillUnmount() {
            this.dispose()
        }

        @action.bound
        componentDidMount() {
            this.disposer = this.observe()
        }
    }
)
```

In this case, your `disposer` will never be called! The reason is that the mixin for making the `ExampleComponent` an `observer` modifies the `componentWillUnmount` method which changes `this` to an unexpected `React.Component` instance. To work around this, declare `componentWillUnmount()` as follows:

```js
componentWillUnmount() {
  runInAction(() => this.dispose())
}
```
