# @observer

The `observer` function / decorator can be used to turn ReactJS components into reactive components.
It wraps the component's render function in `mobservable.autorun` to make sure that any data that is used during the rendering of a component forces a rerendering upon change.
It is available through the separate `mobservable-react` package.

```javascript
import {observer} from "mobservable-react";

var timerData = observable({
	secondsPassed: 0
});

setInterval(function() {
	timerData.secondsPassed++;
}, 1000);

@observer class Timer extends React.Component {
	render() {
		return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
	}
});

React.render(<Timer timerData={timerData} />, document.body);
```

_Note: when `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the most inner (first applied) decorator;
otherwise it might do nothing at all._

### Characterstics of reactive components

So here we are, simple, straightforward reactive components that will render whenever needed. These components have some interesting characteristics:

* They only subscribe to the data structures that where actively used during the last render. This means that you cannot under-subscribe or over-subscribe. You can even use data in your rendering that will only be available at later moment in time. This is ideal for asynchronously loading data.
* You are not required to declare what data a component will use. Instead, dependencies are determined at runtime and tracked in a very fine-grained manner.
* Usually reactive components have no state. But you are still free to use state.
* `@observer` implements `shouldComponentUpdate` so that children are not re-rendered unnecessary.
* Reactive components sideways load data; parent components won't re-render unnecessarily even when child components will.
* `@observer` does not depend on React's context system.


### Mobservable-React-DevTools

In combination with `@observer` you can use the Mobservable-React-DevTools, it shows exactly when your components are rerendered and you can inspect the data dependencies of your components.

### Alternative syntaxes

In ES5 environments, reactive components can be simple declared using `observer(React.createClass({ ... `. See also the [syntax guide](../best/syntax)

When using `@observer`, a lot of components will become stateless.
In such cases you can also write reactive function components using `@observer` (this works also on ES5 and with React 0.13):

```javascript
const Timer = observer( ({timerData}) =>
	(<span>Seconds passed: { timerData.secondsPassed } </span> )
);
```
