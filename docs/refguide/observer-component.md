# @observer

The `observer` function / decorator can be used to turn ReactJS components into reactive components.
It wraps the component's render function in `mobx.autorun` to make sure that any data that is used during the rendering of a component forces a re-rendering upon change.
It is available through the separate `mobx-react` package.

```javascript
import {observer} from "mobx-react"

var timerData = observable({
	secondsPassed: 0
})

setInterval(() => {
	timerData.secondsPassed++
}, 1000)

@observer class Timer extends React.Component {
	render() {
		return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
	}
})

React.render(<Timer timerData={timerData} />, document.body)
```

Tip: when `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the innermost (first applied) decorator;
otherwise it might do nothing at all.

## ES5 support

In ES5 environments, observer components can be simple declared using `observer(React.createClass({ ... `. See also the [syntax guide](../best/syntax.md)

## Stateless function components

The above timer widget could also be written using stateless function components that are passed through `observer`:

```javascript
import {observer} from "mobx-react"

const Timer = observer(({ timerData }) =>
	<span>Seconds passed: { timerData.secondsPassed } </span>
)
```

## Observable local component state

Just like normal classes, you can introduce observable properties on a component by using the `@observable` decorator.
This means that you can have local state in components that doesn't need to be manged by React's verbose and imperative `setState` mechanism, but is as powerful.
The reactive state will be picked up by `render` but will not explicitly invoke other React lifecycle methods like `componentShouldUpdate` or `componentWillUpdate`.
If you need those, just use the normal React `state` based APIs.

The example above could also have been written as:

```javascript
import {observer} from "mobx-react"
import {observable} from "mobx"

@observer class Timer extends React.Component {
	@observable secondsPassed = 0

	componentWillMount() {
		setInterval(() => {
			this.secondsPassed++
		}, 1000)
	}

	render() {
		return (<span>Seconds passed: { this.secondsPassed } </span> )
	}
})

React.render(<Timer timerData={timerData} />, document.body)
```

## When to apply `observer`?

Rule of thumb is to use `observer` on every component in your application that is specific for your application.
With `@observer` there is no need to distinguish 'smart' components from 'dumb' components.
All components become responsible for updating when their _own_ dependencies change.
Its overhead is neglectable and it makes sure that whenever you start using observable data the component will respond to it.

## `observer` and `PureRenderMixin`
`observer` also prevents re-renderings when the *props* of the component have only shallowly changed, which makes a lot of sense if the data passed into the component is reactive.
This behavior is similar to [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html), except that *state* changes are still always processed.
If a component provides its own `shouldComponentUpdate`, that one takes precedence.
See for an explanation this [github issue](https://github.com/mobxjs/mobx/issues/101)

## `componentWillReact` (lifecycle hook)

React components usually render on a fresh stack, so that makes it often hard to figure out what _caused_ a component to re-render.
When using `mobx-react` you can define a new life cycle hook, `componentWillReact` (pun intended) that will be triggered when a component will be scheduled to re-render because
data it observes has changed. This makes it easy to trace renders back to the action that caused the rendering.

```javascript
import {observer} from "mobx-react";

@observer class TodoView extends React.Component {
    componentWillReact() {
        console.log("I will re-render, since the todo has changed!");    
    }

    render() {
        return <div>this.props.todo.title</div>   
    }   
}
```

* `componentWillReact` doesn't take arguments
* `componentWillReact` won't fire before the initial render (use `componentWillMount` instead)
* `componentWillReact` won't fire when receiving new props or after `setState` calls (use `componentWillUpdate` instead)

## Optimizing components

See the relevant [section](../best/react-performance.md).

## MobX-React-DevTools

In combination with `@observer` you can use the MobX-React-DevTools, it shows exactly when your components are re-rendered and you can inspect the data dependencies of your components.
See the [DevTools](../best/devtools.md) section.

## Characteristics of observer components

* Observer only subscribe to the data structures that were actively used during the last render. This means that you cannot under-subscribe or over-subscribe. You can even use data in your rendering that will only be available at later moment in time. This is ideal for asynchronously loading data.
* You are not required to declare what data a component will use. Instead, dependencies are determined at runtime and tracked in a very fine-grained manner.
* Usually reactive components have no or little state, as it is often more convenient to encapsulate (view) state in objects that are shared with other component. But you are still free to use state.
* `@observer` implements `shouldComponentUpdate` in the same way as `PureRenderMixin` so that children are not re-rendered unnecessary.
* Reactive components sideways load data; parent components won't re-render unnecessarily even when child components will.
* `@observer` does not depend on React's context system.

## Enabling ES6 decorators in your transpiler

Decorators are not supported by default when using TypeScript or Babel pending a definitive definition in the ES standard.
* For _typescript_, enable the `--experimentalDecorators` compiler flag or set the compiler option `experimentalDecorators` to `true` in `tsconfig.json` (Recommended)
* For _babel5_, make sure `--stage 0` is passed to the Babel CLI
* For _babel6_, see the example configuration as suggested in this [issue](https://github.com/mobxjs/mobx/issues/105)
