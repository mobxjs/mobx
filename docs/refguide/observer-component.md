# @observer

The `observer` function / decorator can be used to turn ReactJS components into reactive components.
It wraps the component's render function in `mobx.autorun` to make sure that any data that is used during the rendering of a component forces a re-rendering upon change.
It is available through the separate `mobx-react` package.

```javascript
import {observer} from "mobx-react";

var timerData = observable({
	secondsPassed: 0
});

setInterval(() => {
	timerData.secondsPassed++;
}, 1000);

@observer class Timer extends React.Component {
	render() {
		return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
	}
});

React.render(<Timer timerData={timerData} />, document.body);
```

Tip: when `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the innermost (first applied) decorator;
otherwise it might do nothing at all.

Note that using `@observer` as decorator is optional, `observer(class Timer ... { })` achieves exactly the same.

## Gotcha: dereference values _inside_ your components
MobX can do a lot, but it cannot make primitive values observable (although it can wrap them in an object see [boxed observables](boxed.md)).
So not the _values_ that are observable, but the _properties_ of an object. This means that `@observer` actually reacts to the fact that you dereference a value.
So in our above example, the `Timer` component would **not** react if it was initialized as follows:

```javascript
React.render(<Timer timerData={timerData.secondsPassed} />, document.body)
```
In this snippet just the current value of `secondsPassed` is passed to the `Timer`, which is the immutable value `0` (all primitives are immutable in JS).
That number won't change anymore in the future, so `Timer` will never update. It is the property `secondsPassed` that will change in the future,
so we need to access it *in* the component. Or in other words: values need to be passed _by reference_ and not by value.

## ES5 support

In ES5 environments, observer components can be simple declared using `observer(React.createClass({ ... `. See also the [syntax guide](../best/syntax.md)

## Stateless function components

The above timer widget could also be written using stateless function components that are passed through `observer`:

```javascript
import {observer} from "mobx-react";

const Timer = observer(({ timerData }) =>
	<span>Seconds passed: { timerData.secondsPassed } </span>
);
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

React.render(<Timer />, document.body)
```

For more advantages of using observable local component state, see [3 reasons why I stopped using `setState`](https://medium.com/@mweststrate/3-reasons-why-i-stopped-using-react-setstate-ab73fc67a42e).

## Connect `observer` to stores

The `mobx-react` package also provides the `Provider` component that can be used to pass down stores using React's context mechanism.
To connect to those stores, pass an array of store names to `observer`, which will make the stores available as props.
This is supported when using the decorator (`@observer(["store"]) class ...`, or the function `observer(["store"], React.createClass({ ...``.

Example:

```javascript
const colors = observable({
   foreground: '#000',
   background: '#fff'
});

const App = () =>
  <Provider colors={colors}>
     <app stuff... />
  </Provider>;

const Button = observer(["colors"], ({ colors, label, onClick }) =>
  <button style={{
      color: colors.foreground,
      backgroundColor: colors.background
    }}
    onClick={onClick}
  >{label}<button>
);

// later..
colors.foreground = 'blue';
// all buttons updated
```

See for more information the [`mobx-react` docs](https://github.com/mobxjs/mobx-react#provider-experimental).


## When to apply `observer`?

The simple rule of thumb is: _all components that render observable data_.
If you don't want to mark a component as observer, for example to reduce the dependencies of a generic component package, make sure you only pass it plain data.

With `@observer` there is no need to distinguish 'smart' components from 'dumb' components for the purpose of rendering.
It is still a good separation of concerns for where to handle events, make requests etc.
All components become responsible for updating when their _own_ dependencies change.
Its overhead is neglectable and it makes sure that whenever you start using observable data the component will respond to it.
See this [thread](https://www.reddit.com/r/reactjs/comments/4vnxg5/free_eggheadio_course_learn_mobx_react_in_30/d61oh0l) for more details.

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
        return <div>this.props.todo.title</div>;
    }
}
```

* `componentWillReact` doesn't take arguments
* `componentWillReact` won't fire before the initial render (use `componentWillMount` instead)
* `componentWillReact` for mobx-react@4+, the hook will fire when receiving new props and after `setState` calls

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
* In mobx-react@4+, the props object and the state object of an observer component are automatically made observable to make it easier to create @computed properties that derive from props inside such a component. If you have a reaction (i.e. `autorun`) inside your `@observer` component that must _not_ be re-evaluated when the specific props it uses don't change, be sure to derefence those specific props for use inside your reaction (i.e. `const myProp = props.myProp`). Otherwise, if you reference `props.myProp` inside the reaction, then a change in _any_ of the props will cause the reaction to be re-evaluated. For a typical use case with React-Router, see [this article](https://alexhisen.gitbooks.io/mobx-recipes/content/observable-based-routing.html).

## Enabling ES6 decorators in your transpiler

Decorators are not supported by default when using TypeScript or Babel pending a definitive definition in the ES standard.
* For _typescript_, enable the `--experimentalDecorators` compiler flag or set the compiler option `experimentalDecorators` to `true` in `tsconfig.json` (Recommended)
* For _babel5_, make sure `--stage 0` is passed to the Babel CLI
* For _babel6_, see the example configuration as suggested in this [issue](https://github.com/mobxjs/mobx/issues/105)
