# @reactiveComponent

The `reactiveComponent` function / decorator can be used to turn ReactJS components into reactive components.
It wraps the component's render function in `mobservable.observe` to make sure that any data that is used during the rendering of a component forces a rerendering upon change.
It is available through the separate `mobservable-react` package.

```javascript
import {reactiveComponent} from "mobservable-react";

var timerData = {
	secondsPassed: 0
};

setInterval(function() {
	timerData.secondsPassed++;
}, 1000);

@reactiveComponent class Timer extends React.Component {
	render() {
		return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
	}
});

React.render(<Timer timerData={timerData} />, document.body);
```

In ES5 environments, reactive components can be simple declared using `reactiveComponent(React.createClass({ ... `.

When using `@reactiveComponent`, a lot of components will become stateless.
In such cases you can also write reactive function components using `@reactiveComponent` (this works also on ES5 and with React 0.13):

```javascript
const Timer = @reactiveComponent( ({timerData}) =>
	(<span>Seconds passed: { timerData.secondsPassed } </span> )
);
```
_Note: when `reactiveComponent` needs to be combined with other decorators or higher-order-components, make sure that `reactiveComponent` is the most inner (first applied) decorator;
otherwise it might do nothing at all._

