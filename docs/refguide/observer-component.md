# @observer

The `observer` function / decorator can be used to turn ReactJS components into reactive components.
It wraps the component's render function in `mobservable.autorun` to make sure that any data that is used during the rendering of a component forces a rerendering upon change.
It is available through the separate `mobservable-react` package.

```javascript
import {observer} from "mobservable-react";

var timerData = {
	secondsPassed: 0
};

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

In ES5 environments, reactive components can be simple declared using `observer(React.createClass({ ... `.

When using `@observer`, a lot of components will become stateless.
In such cases you can also write reactive function components using `@observer` (this works also on ES5 and with React 0.13):

```javascript
const Timer = @observer( ({timerData}) =>
	(<span>Seconds passed: { timerData.secondsPassed } </span> )
);
```
_Note: when `observer` needs to be combined with other decorators or higher-order-components, make sure that `observer` is the most inner (first applied) decorator;
otherwise it might do nothing at all._
