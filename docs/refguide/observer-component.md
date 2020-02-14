---
title: (@)observer components
sidebar_label: (@)observer components
hide_title: true
---

# @observer

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 1: observable & observer</summary>
    <br />
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react">Hosted on egghead.io</a>
</details>

The `observer` HoC / decorator subscribes React components automatically to _any observables_ that are used _during render_.
As a result, components will automatically re-render when relevant observables change.
But it also makes sure that components don't re-render when there are _no relevant_ changes.
As a result MobX applications are in practice much better optimized than Redux or vanilla React applications are out of the box.

-   `observer` is provided through the separate [`mobx-react` package](https://github.com/mobxjs/mobx-react).
-   If your code base doesn't have any class based components, you can also the [`mobx-react-lite` package](https://github.com/mobxjs/mobx-react-lite), which is smaller.

## `observer` automatically tracks observables used during render

Using `observer` is pretty straight forward:

```javascript
import { observer } from "mobx-react"

var timerData = observable({
    secondsPassed: 0
})

setInterval(() => {
    timerData.secondsPassed++
}, 1000)

// A hooks based component wrapped with `timerData` will react to changes automatically
const Timer = observer(({ timerData }) => <span>Seconds passed: {timerData.secondsPassed} </span>)

// Alternatively, a class based component:
@observer
class Timer extends React.Component {
    render() {
        return <span>Seconds passed: {this.props.timerData.secondsPassed} </span>
    }
}

ReactDOM.render(<Timer timerData={timerData} />, document.body)
```

Because `observer` automatically tracks any observables that are used (and none more), the `Timer` component above will automatically re-render whenever `timerData.secondsPassed` is updated, since it is declared as an observable.

Note that `observer` _only_ subscribes to observables used during the _own_ render of the component. So if observables are passed to child components, those have to be marked as `observer` as well. This also holds for any callback based components.

## `observer` listens to _any_ observables used

In above components the timer data is received as prop, but in principle that is irrelevant for the working for `observer`.
Rewriting the `Timer` component above to the following results in semantically the same application:

```javascript
const timerData = observable(/* ... */)

const Timer = observer(() => <span>Seconds passed: {timerData.secondsPassed} </span>)
```

Note that the `timerData` is now read directly from the closure.
This is a practice we don't recommend, but is shown to demonstrate that `observer` tracks any observables used, regardless where they are coming from.

## Using context to pass observables around

This means that it also possible to store observables in context and use them, and `observer` will still do its job:

```javascript
const TimerContext = React.createContext()

const Timer = observer(() => {
    const timerData = useContext(TimerContext)
    return <span>Seconds passed: {timerData.secondsPassed} </span>
})

const timerData = observable(/* ... */)

const App = () => (
    <TimerContext.Provider value={timerData}>
        <Timer />
    </TimerContext.Provider>
)
```

## Storing observables in local component state

Similarly, we can store observables in local component state using `useState`. Although in practice local component state is often simple enough to not really need observables. Note that we don't need the state _setter_ since we will mutate the observable, rather than replacing it entirely:

```javascript
const Timer = observer(() => {
    const [timerData] = useState(() =>
        observable({
            secondsPassed: 0
        })
    )

    useEffect(() => {
        const handle = setInterval(() => {
            timerData.secondsPassed++
        }, 1000)
        return () => {
            clearTimeout(handle)
        }
    }, [])

    return <span>Seconds passed: {timerData.secondsPassed} </span>
})
```

-   Tip: the [`useLocalStore`](https://github.com/mobxjs/mobx-react#uselocalstore-hook) hook further simplifies this pattern.
-   Tip: if for some reason `props` or non-observable local state needs to be synced with the observable state, the [`useObservableSource`](https://github.com/mobxjs/mobx-react#useasobservablesource-hook) hook can be used.

In general we recommend to not resort to using MobX observables for local component state too quickly; as this can theoretically lock you out of some features of React's Suspense mechanism. Generally speaking it only adds real value when there are complex computations involved (which MobX will optimize) or when there are complex view models.

## Local observable state in class based components

Just like normal classes, you can introduce observable properties on a component by using the `@observable` decorator.
Hence the example above could also have been written as:

```javascript
@observer
class Timer extends React.Component {
    @observable secondsPassed = 0

    componentWillMount() {
        setInterval(() => {
            this.secondsPassed++
        }, 1000)
    }

    render() {
        return <span>Seconds passed: {this.secondsPassed} </span>
    }
}
```

For more advantages of using observable local component state, for class based components see [3 reasons why I stopped using `setState`](https://medium.com/@mweststrate/3-reasons-why-i-stopped-using-react-setstate-ab73fc67a42e).

## When to apply `observer`?

The simple rule of thumb is: _all components that render observable data_.
If you don't want to mark a component as observer, for example to reduce the dependencies of a generic component package, make sure you only pass it plain data, for example by converting it to plain data in a parent component, that is an `observer`, using `toJS`.

## Characteristics of observer components

-   Observer enables your components to interact with state that is not managed by React, and still update as efficiently as possible. This is great for decoupling.
-   Observer only subscribe to the data structures that were actively used during the last render. This means that you cannot under-subscribe or over-subscribe. You can even use data in your rendering that will only be available at later moment in time. This is ideal for asynchronously loading data.
-   You are not required to declare what data a component will use. Instead, dependencies are determined at runtime and tracked in a very fine-grained manner.
-   `@observer` implements `memo` / `shouldComponentUpdate` automatically so that children are not re-rendered unnecessary.
-   `observer` based components sideways load data; parent components won't re-render unnecessarily even when child components will.
-   The props object and the state object of an observer component are automatically made observable to make it easier to create @computed properties that derive from props inside such a component.

## Tips

#### Use the `<Observer>` component in cases where you can't use observer

Sometimes it is hard to apply `observer` to a part of the rendering, for example because you are rendering inside a callback, and you don't want to extract a new component to be able to mark it as `observer`.
In those cases [`<Observer />`](https://github.com/mobxjs/mobx-react#observer) comes in handy. It takes a callback render function, that is automatically rendered again every time an observable used is changed:

```javascript
const Timer = ({ timerData }) => (
    <div>
        Seconds passed:
        <Observer>{() => <span>{timerData.secondsPassed} </span>}</Observer>
    </div>
)
```

#### How can I further optimize my React components?

See the relevant [React performance section](../best/react-performance.md).

#### Using `observer` with classes without decorators

Using `@observer` as a decorator is optional, `const Timer = observer(class Timer ... { })` achieves exactly the same.

#### How to enable decorators?

See also the [syntax guide](../best/decorators.md)

#### When combining `observer` with other higher-order-components, apply `observer` first

When `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the innermost (first applied) decorator;
otherwise it might do nothing at all.

#### Gotcha: dereference values _inside_ your components

MobX can do a lot, but it cannot make primitive values observable (although it can wrap them in an object see [boxed observables](boxed.md)).
So not the _values_ that are observable, but the _properties_ of an object. This means that `@observer` actually reacts to the fact that you dereference a value.
So in our above example, the `Timer` component would **not** react if it was initialized as follows:

```javascript
React.render(<Timer timerData={timerData.secondsPassed} />, document.body)
```

In this snippet just the current value of `secondsPassed` is passed to the `Timer`, which is the immutable value `0` (all primitives are immutable in JS).
That number won't change anymore in the future, so `Timer` will never update. It is the property `secondsPassed` that will change in the future,
so we need to access it _inside_ the component. One could also say: values need to be passed _by reference_ and not by value.

If the problem is not entirely clear, make sure to study [what does MobX react to?](best/react.md) first!

#### Advanced interaction patterns with reactions, observables, props, etc

In general we recommend to keep UI state and domain state clearly separated,
and manage side effects etc either outside the components using the tools that MobX provides for them (`when`, `flow`, `reaction` etc),
or, if side effects operate on local component state, use the React primitives like `useEffect`.
Generally it is the clearest to keep those things separated, however, in case you need to cross the boundaries,
you might want to check [mobx-react.js.org](https://mobx-react.js.org/) for pattern on how to connect the two frameworks in more complicated scenario's.

## Troubleshooting

1. Make sure you didn't forget `observer` (yes, this is the most common mistake)
2. Make sure you grok how tracking works in general: [what will MobX react to](best/react.md)
3. Read the [common mistakes](best/pitfalls.md) section
4. Use [trace](best/trace.md) to verify that you are subscribing to the right things or check what MobX is doing in general using [spy](refguide/spy.md) / the [mobx-logger](https://github.com/winterbe/mobx-logger) package.
