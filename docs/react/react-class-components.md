---
title: React class components
sidebar_label: React based components
hide_title: true
---

# React class components

[react-integration](React integration) discusses the basic patterns for
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

## Using decorators

The previous example looks a bit cumbersome. We recommended switching class
components to function components if you can, and to use `useState` for maintaining
simple state. But decorators are still supported -- here is the same example with
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
