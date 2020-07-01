---
title: React integration
sidebar_label: React integration
hide_title: true
---

# React integration

While MobX works independently from React they are most commonly used together. In [the gist of Mobx](../intro/overview.md) as well as the [conceptual introduction](../intro/concepts.md) you have already seen the most important part of this integration: the `observer` [HoC](https://reactjs.org/docs/higher-order-components.html) that you can wrap around a React component.

The `observer` HoC subscribes React components automatically to _any observables_ that are used _during render_.
As a result, components will automatically re-render when relevant observables change.
But it also makes sure that components don't re-render when there are _no relevant_ changes.
As a result MobX applications are in practice much better optimized than Redux or vanilla React applications are out of the box.

-   `observer` is provided through the separate [`mobx-react` package](https://github.com/mobxjs/mobx-react).
-   If your code base doesn't have any class based components but only uses function components, you can also the [`mobx-react-lite` package](https://github.com/mobxjs/mobx-react-lite), which is smaller.

## `observer` automatically tracks observables used during render

Using `observer` is pretty straight forward:

```javascript
import React from "react"
import ReactDOM from "react-dom"
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react"

class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increaseTimer() {
        this.secondsPassed += 1
    }
}

const myTimer = new Timer()

setInterval(() => {
    myTimer.increaseTimer()
}, 1000)

// A function component wrapped with `observer` reacts to changes to anything observable that it uses automatically
const TimerView = observer(({ timer }) => <span>Seconds passed: {timer.secondsPassed}</span>)

ReactDOM.render(<TimerView timer={myTimer} />, document.body)
```

Because `observer` automatically tracks any observables that are used (and none more), the `Timer` component above will automatically re-render whenever `myTimer.secondsPassed` is updated, since it is declared as an observable.

Note that `observer` _only_ subscribes to observables used during the _own_ render of the component. So if observables are passed to child components, those have to be marked as `observer` as well. This also holds for any callback based components.

## `observer` listens to _any_ observables used

In above components the app state is received as prop, but in principle that is irrelevant for the working for `observer`.
Rewriting the `TimerView` component above to the following results in semantically the same application:

```javascript
const TimerView = observer(() => <span>Seconds passed: {myTimer.secondsPassed} </span>)
```

Note that `TimerView` does not take any props now, but directly refers to the `myTimer` instance from the closure.

We recommend you pass observable components as props instead of directly using a global, because it makes your code more loosely coupled and testable, though this pattern can be useful at times at the root of your application or if you have globally shared state. In any case this demonstrates that `observer` tracks any observables used, regardless where they are coming from.

## Using context to pass observables around

This means that it also possible to store observables in context and use them, and `observer` still does its job:

```javascript
import { useContext } from "react"

const TimerContext = React.createContext()

const TimerView = observer(() => {
    const timer = useContext(TimerContext)
    return <span>Seconds passed: {timer.secondsPassed} </span>
})

const App = () => (
    <TimerContext.Provider value={myTimer}>
        <TimerView />
    </TimerContext.Provider>
)
```

## Storing observables in local component state

Similarly, we can store observables in local component state using `useState`. Although in practice local component state is often simple enough to not really need observables. Note that we don't need the state _setter_ since we will mutate the observable, rather than replacing it entirely:

```javascript
import { action, observable } from "mobx"

const TimerView = observer(() => {
    const [timer] = useState(() =>
        observable({
            secondsPassed: 0
        })
    )

    useEffect(() => {
        const handle = setInterval(
            action(() => {
                timer.secondsPassed++
            }),
            1000
        )
        return () => {
            clearTimeout(handle)
        }
    }, [])

    return <span>Seconds passed: {timer.secondsPassed} </span>
})
```

-   Tip: the [`useLocalStore`](https://github.com/mobxjs/mobx-react#uselocalstore-hook) hook further simplifies this pattern.
-   Tip: if for some reason `props` or non-observable local state needs to be synced with the observable state, the [`useObservableSource`](https://github.com/mobxjs/mobx-react#useasobservablesource-hook) hook can be used.

In general we recommend not to resort to using MobX observables for local component state too quickly; as this can theoretically lock you out of some features of React's Suspense mechanism. You can instead use the [`useState` hook](https://reactjs.org/docs/hooks-state.html) directly, without the use of `observable`. Using MobX observables as local state can add real value when there are complex computations involved (which MobX will optimize) or when there are complex view models.

## When to apply `observer`?

The simple rule of thumb is: _all components that render observable data_. If
you are in doubt, apply `observer` as using it is cheap.

If you don't want to mark a component as observer, for example to reduce the dependencies of a generic component package, make sure you only pass it plain data, for example by converting it to plain data in a parent component, that is an `observer`, using `toJS`.

## Characteristics of observer components

-   Observer enables your components to interact with state that is not managed by React, and still update as efficiently as possible. This is great for decoupling.
-   Observer only subscribe to the data structures that were actively used during the last render. This means that you cannot under-subscribe or over-subscribe. You can even use data in your rendering that will only be available at a later moment in time. This is ideal for asynchronously loading data.
-   You are not required to declare what data a component uses. Instead, dependencies are determined at runtime and tracked in a very fine-grained manner.
-   `observer` implements `memo` / `shouldComponentUpdate` automatically so that children are not re-rendered unnecessary.
-   `observer` based components sideways load data; parent components won't re-render unnecessarily even when child components will.

## React class based components

Briefly, you can wrap class-based components in `observer` just like
you can wrap function components:

```javascript
import React from "React"

const TimerView = observer(
    class TimerView extends React.Component {
        render() {
            const { timer } = this.props
            return <span>Seconds passed: {timer.secondsPassed} </span>
        }
    }
)
```

See [React class components](react-class-components.md) for more information.

## Tips

#### Use the `<Observer>` component in cases where you can't use observer

Sometimes it is hard to apply `observer` to a part of the rendering, for example because you are rendering inside a callback, and you don't want to extract a new component to be able to mark it as `observer`.
In those cases [`<Observer />`](https://github.com/mobxjs/mobx-react#observer) comes in handy. It takes a callback render function, that is automatically rendered again every time an observable used is changed:

```javascript
import { Observer } from "mobx-react"

const TimerView = ({ timer }) => (
    <div>
        Seconds passed:
        <Observer>{() => <span>{timer.secondsPassed} </span>}</Observer>
    </div>
)
```

#### How can I further optimize my React components?

See the relevant [React performance section](react-performance.md).

#### When combining `observer` with other higher-order-components, apply `observer` first

When `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the innermost (first applied) decorator;
otherwise it might do nothing at all.

#### Gotcha: dereference values _inside_ your components

MobX can do a lot, but it cannot make primitive values observable (although it can wrap them in an object; see [boxed observables](../refguide/boxed.md)).
So it is not the _values_ that are observable, but the _properties_ of an object. This means that `observer` actually reacts to the fact that you dereference a value.

So in this example, the `TimerView` component would **not** react if it was defined
as follows:

```javascript
const TimerView = observer(({ secondsPassed }) => <span>Seconds passed: {secondsPassed}</span>)

React.render(<TimerViewer secondPassed={myTimer.secondsPassed} />, document.body)
```

In this snippet only the current value of `myTimer.secondsPassed` is passed to `TimerView`, which is the immutable value `0` (all primitives are immutable in JS).
That number value won't change anymore in the future, so `TimerView` will never update. It is the property `secondsPassed` that will change in the future,
so we need to access it _inside_ the component. One could also say: values need to be passed _by reference_ and not by value.

If the problem is not entirely clear, make sure to study [what does MobX react to?](../best/react.md) first!

## Troubleshooting

1. Make sure you didn't forget `observer` (yes, this is the most common mistake)
2. Make sure you grok how tracking works in general: [what will MobX react to](../best/react.md)
3. Read the [common mistakes](../best/pitfalls.md) section
4. Use [trace](../best/trace.md) to verify that you are subscribing to the right things or check what MobX is doing in general using [spy](../refguide/spy.md) / the [mobx-logger](https://github.com/winterbe/mobx-logger) package.
