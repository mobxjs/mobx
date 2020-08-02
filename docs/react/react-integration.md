---
title: React integration
sidebar_label: React integration
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# React integration

Usage:

```javascript
import {observer} from 'mobx-react-lite

const MyComponent = observer(props => ReactElement)
```

While MobX works independently from React they are most commonly used together. In [the gist of Mobx](../intro/overview.md) as well as the [conceptual introduction](../intro/concepts.md) you have already seen the most important part of this integration: the `observer` [HoC](https://reactjs.org/docs/higher-order-components.html) that you can wrap around a React component.

The `observer` HoC subscribes React components automatically to _any observables_ that are used _during render_.
As a result, components will automatically re-render when relevant observables change.
But it also makes sure that components don't re-render when there are _no relevant_ changes.
As a result MobX applications are in practice much better optimized than Redux or vanilla React applications are out of the box when using large collections or state that is re-used in many places.

`observer` is provided through the separate [`mobx-react-lite` package](https://github.com/mobxjs/mobx-react-lite).
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

// A function component wrapped with `observer` will reacts to any
// future change in an observable it used before
const TimerView = observer(({ timer }) => <span>Seconds passed: {timer.secondsPassed}</span>)

ReactDOM.render(<TimerView timer={myTimer} />, document.body)
```

## observer components listen to _any_ observables read during render

For `observer` to work it doesn't matter _how_ the observables arrive in the component; only that they are read.
This means that observation is deep; so complex expression like `todos[0].author.displayName` work out of the box.
It also means that observables that are accessible by the component, but not actually read, won't cause a re-render ever.
This makes the subscription mechanism is much more precise and efficient compared to any framework in which data dependencies have to be explicitly declared or preprocessed (with for example selectors).

Since it doesn't matter (technically that is) what we read, or where observables originated from,
there is great flexibility in how state is organized.
Here are a few options,
updates to the timer will be properly reflected in all examples:

### Using external state in `observer` components

<!--DOCUSAURUS_CODE_TABS-->
<!--using props-->

Observables can be passed as properties into components as props, as was done in the example above:

```javascript
import { observer } from "mobx-react-lite"

const myTimer = new Timer() // see Timer definition above

const TimerView = observer(({ timer }) => <span>Seconds passed: {timer.secondsPassed}</span>)

// pass myTimer as props
ReactDOM.render(<TimerView timer={myTimer} />, document.body)
```

<!--using global variables-->

Since it doesn't matter _how_ we got the reference to an observable, we can consume
observables from closures directly. (Including from imports etc).

```javascript
const myTimer = new Timer() // see Timer definition above

// No props, the `myTimer` is directly consumed from the closure
const TimerView = observer(() => <span>Seconds passed: {myTimer.secondsPassed}</span>)

ReactDOM.render(<TimerView />, document.body)
```

Using observables directly works very well, but since it typically creates module state, it might complicate unit testing, and we recommend using React Context instead.

<!--using context-->

[React Context](https://reactjs.org/docs/context.html) is a great mechanism to share observables with an entire subtree.

```javascript
import {observer} from 'mobx-react-lite'
import {createContext, useContext} from "react"

const TimerContext = createContext<Timer>()

const TimerView = observer(() => {
    // grab the timer from context
    const timer = useContext(TimerContext) // see Timer definition above
    return (
        <span>Seconds passed: {timer.secondsPassed}</span>
    )
})

ReactDOM.render(
    <TimerContext.Provider value={new Timer()}
        <TimerView />
    </TimerContext.Provider>,
    document.body
)
```

Note that we don't recommend ever replacing the `value` of a `Provider`. With MobX there should be no need for that, since the observable that is shared can be updated itself.

<!--END_DOCUSAURUS_CODE_TABS-->

### Using local observable state in `observer` components

Since observables used by `observer` can come from anywhere, they can local state as well.
Again, different options are available for us:

<!--DOCUSAURUS_CODE_TABS-->
<!--`useState` with observable class-->

The simplest way to use local observable state is to store a reference to an observable class with `useState`.
Note that, since we typically don't want to replace the reference, we don't need the updater function returned by `useState`:

```javascript
import { observer } from "mobx-react-lite"
import { useState } from "react"

const TimerView = observer(() => {
    const [timer] = useState(() => new Timer()) // see Timer definition above
    return <span>Seconds passed: {timer.secondsPassed}</span>
})

ReactDOM.render(<TimerView />, document.body)
```

If you want to automatically update the timer like we did in the original example,
an `useEffect` could be used in typical React fashion:

```javascript
useEffect(() => {
    const handle = setInterval(() => {
        myTimer.increaseTimer()
    }, 1000)
    return () => {
        clearInterval(handle)
    }
}, [myTimer])
```

<details><summary>What about `useMemo`?</summary>
A critical reader might notice that we might have used `useMemo`, 
rather than `useState`. 
That would in practice work the same.
However, React doesn't _guarantee_ that memoized values are actually
memoized in all cases, so it _could_ randomly throw away our Timer instance
and create a fresh one. 
</details>

<!--`useState` with local observable object-->

As stated before, instead of using classes, it is possible to directly create observable objects.
We can leverage [observable](observable.md) for that.

```javascript
import { observer } from "mobx-react-lite"
import { observable } from "mobx"
import { useState } from "react"

const TimerView = observer(() => {
    const [timer] = useState(() =>
        observable({
            secondsPassed: 0,
            increaseTimer() {
                this.secondsPassed++
            }
        })
    )
    return <span>Seconds passed: {timer.secondsPassed}</span>
})

ReactDOM.render(<TimerView />, document.body)
```

<!--`useLocalStore` hook-->

The combination `const [store] = useState(() => observable({ /* something */}))` is
quite common. To make this pattern simpler the [`useLocalStore`](https://github.com/mobxjs/mobx-react#uselocalstore-hook) hook is exposed from `mobx-react-lite`, making it possible to simplify the earlier example to:

```javascript
import { observer, useLocalStore } from "mobx-react-lite"
import { useState } from "react"

const TimerView = observer(() => {
    const timer = useLocalStore(() => ({
        secondsPassed: 0,
        increaseTimer() {
            this.secondsPassed++
        }
    }))
    return <span>Seconds passed: {timer.secondsPassed}</span>
})

ReactDOM.render(<TimerView />, document.body)
```

<!--END_DOCUSAURUS_CODE_TABS-->

### You might not need locally observable state

In general we recommend not to resort to using MobX observables for local component state too quickly; as this can theoretically lock you out of some features of React's Suspense mechanism.
As a rule of thumb use MobX observables when the state captures domain data that is shared among components (including children), such as todo items, users, bookings, etc.
State that is only captures UI state, such as loading state, selections, etc, might be better served by the [`useState` hook](https://reactjs.org/docs/hooks-state.html), since this allows you to leverage React suspense features in the future.

## When to apply `observer`?

The simple rule of thumb is: _all components that render observable data_.

`observer` only enhances the component you are decorating, not the components used inside it. So usually all your components should be wrapped by `observer`. Don't worry, this is not inefficient, in contrast, more `observer` components make rendering more efficient.

### Tip: Dereference values _inside_ your components

MobX can do a lot, but it cannot make primitive values observable.
So MobX works the best if you pass object references around as long as possible, and only read their properties inside the `observer` based components that are going to render them into the DOM / low-level components.
In other words, `observer` reacts to the fact that you dereference a value.

In the above example, the `TimerView` component would **not** react to future changes if it was defined
as follows, because the `.secondsPassed` is not actually read inside the `observer` component, and hence not tracked:

```javascript
const TimerView = observer(({ secondsPassed }) => <span>Seconds passed: {secondsPassed}</span>)

React.render(<TimerViewer secondPassed={myTimer.secondsPassed} />, document.body)
```

If the problem is not entirely clear, make sure to study [what does MobX react to?](../best/what-does-mobx-react-to.md) first!

Note that this is a different mindset from other libraries like React-redux, where it is a good practice to dereference early and pass primitives down, to better leverage memoization.

### Common pitfall: Passing observables to components that aren't `observer`

Components wrapped with `observer` _only_ subscribe to observables used during the _own_ render of the component. So if observable objects/ arrays / maps are passed to child components, those have to be marked as `observer` as well. This also holds for any callback based components.

If you want to pass observables to a component that isn't `observer`, for example because it is a third-party component, or you want to keep that component MobX agnostic, you will have to [convert the observables to plain JavaScript structures](observable.md#converting-observables-back-to-vanilla-javascript-collections) before passing them on.

Given a an observable `todo` object, a `TodoView` component (observer) and an imaginary `GridRow` component that takes a column / value mapping, which isn't observer:

```javascript
class Todo {
    title = "test"
    done = true

    constructor() {
        makeAutoObservable(this)
    }
}

const TodoView = observer(({ todo }: { todo: Todo }) =>
   // WRONG: GridRow won't pick up changes in todo.title / todo.done
   // since it isn't an observer
   return <GridRow data={todo} />

   // CORRECT: let `Todo` picks up relevant changes, and pass plain data down
   return <GridRow data={{
       title: todo.title,
       done: todo.done
   }} />

   // NOTE: `data={toJS(todo)} would have worked as well
)
```

### Common pitfall: Using observables in a callback component that isn't `observer`

Imagine the same example, where `GridRow` takes an `onRender` callback instead.
Since `onRender` is part of the rendering cycle of `GridRow`, rather than `TodoView`'s render (even though that is where it syntactically appears), we have to make sure that the callback component uses an `observer` component.
Or, we can create an in-line anonymous observer using [`<Observer />`](https://github.com/mobxjs/mobx-react#observer):

```javascript
const TodoView = observer(({ todo }: { todo: Todo }) =>
   // WRONG: GridRow.onRender won't pick up changes in todo.title / todo.done
   // since it isn't an observer
   return <GridRow onRender={() => <td>{todo.title}</td>} />

   // CORRECT: wrap the callback rendering in Observer to be able to detect changes
   return <GridRow onRender={() => <Observer>{() =>
     <td>{todo.title}</td>
   }} />
}
```

## Tips

<details><summary>mobx-react vs. mobx-react-lite
</summary>
In this documentation we used `mobx-react-lite` as default.
[`mobx-react`](https://github.com/mobxjs/mobx-react/) is it's big brother, which uses `mobx-react-lite` under the hood.
It offers a few more features which are typically not needed anymore in greenfield projects. The additional things offered by mobx-react:

1. Support for React class components
1. `Provider` and `inject`. MobX own React.createContext predecessor which is not needed anymore
1. observable specific `propTypes`

Note that `mobx-react` fully repackages and re-exports `mobx-react-lite`, including function component support.
If you use `mobx-react`, there is no need to add `mobx-react-lite` as dependency or import from it anywhere.

</details>

<details><summary>
Tip: `observer` for class based React components
</summary>
As stated above, class based components are only supported through `mobx-react`, and not `mobx-react-lite`. 
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

See the [mobx-react docs](https://github.com/mobxjs/mobx-react#api-documentation) for more information.

</details>

<details><summary>
Tip: nice component names in React DevTools 
</summary>
[React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html) uses the display name information of components to properly display the component hierarchy.

If you use:

```javascript
export const MyComponent = observer(props => <div>hi</div>)
```

then no display name will be visible in the DevTools.

![devtools-noname](../assets/devtools-noDisplayName.png)

The following approaches can be used to fix this:

-   use `function` with a name instead of an arrow function. `mobx-react` infers component name from function name:

    ```javascript
    export const MyComponent = observer(function MyComponent(props) {
        return <div>hi</div>
    })
    ```

-   The transpiler (like Babel or TypeScript) infers component name from variable name:

    ```javascript
    const _MyComponent = props => <div>hi</div>
    export const MyComponent = observer(_MyComponent)
    ```

-   Infer from variable name again, using default export:

    ```javascript
    const MyComponent = props => <div>hi</div>
    export default observer(MyComponent)
    ```

-   [**Broken**] Set `displayName` explicitly:

    ```javascript
    export const MyComponent = observer(props => <div>hi</div>)
    MyComponent.displayName = "MyComponent"
    ```

    This is broken in React at the time of writing; mobx-react `observer` uses a React.memo and runs into this bug: https://github.com/facebook/react/issues/18026

Now you can see component names:

![devtools-withname](../assets/devtools-withDisplayName.png)

</details>

<details><summary>
🚀 When combining `observer` with other higher-order-components, apply `observer` first
</summary>

When `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the innermost (first applied) decorator;
otherwise it might do nothing at all.

</details>

<details><summary>🚀 Tip: Deriving computeds from props</summary>
In some the computed values of your local observable might depend on some of the 
props your component receives.
However, the set of props that a React component receives is in itself not observable, so changes to the props won't be reflected in any computed values. 
To make props observable, the [`useAsObservableSource`](https://github.com/mobxjs/mobx-react#useasobservablesource-hook) hook can be used, that will sync the props of a component into an local observable object.
_Note that it is important to not deconstruct the result of this hook._

```javascript
import { observer, useLocalStore, useAsObservableSource } from "mobx-react-lite"
import { useState } from "react"

const TimerView = observer(({ offset }) => {
    const observableProps = useAsObservableSource({ offset })
    const timer = useLocalStore(() => ({
        secondsPassed: 0,
        increaseTimer() {
            this.secondsPassed++
        },
        get offsetTime() {
            return this.secondsPassed - observableProps.offset // not 'offset'!
        }
    }))
    return <span>Seconds passed: {timer.offsetTime}</span>
})

ReactDOM.render(<TimerView />, document.body)
```

In practice you will rarely need this pattern, since
`return <span>Seconds passed: {timer.secondsPassed - offset}</span>`
is a much simpler, albeit slightly less efficient solution.

</details>

### How can I further optimize my React components?

See the relevant [React performance section](react-performance.md).

## Troubleshooting

Help! My component isn't re-rendering...

1. Make sure you didn't forget `observer` (yes, this is the most common mistake)
1. Verify that the thing you intend to react to is indeed observable. Use utilities like [`isObservable`](api.md#isobservable), [`isObservableProp`](api.md#isobservableprop) if needed to verify this at runtime.
1. Check the console logs in the browsers for any warnings or errors.
1. Make sure you grok how tracking works in general: [what does MobX react to](../best/what-does-mobx-react-to.md)
1. Read the common pitfalls as described above.
1. [Configure](configure) MobX to warn you of unsound usage of MobX mechanisms and check the console logs.
1. Use [trace](../best/trace.md) to verify that you are subscribing to the right things or check what MobX is doing in general using [spy](../refguide/spy.md) / the [mobx-logger](https://github.com/winterbe/mobx-logger) package.
