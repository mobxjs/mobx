# Reactive React Components

What if the `render` function of a [React](https://facebook.github.io/react) component was just a reactive view to update the DOM?
Then we would have a system that keeps the user interface actively in sync with the state, without ever [wasting](https://facebook.github.io/react/docs/perf.html#perf.printwastedmeasurements) a rendering.
And without explicitly declaring dependencies.

That is exactly what the `observer` function (and decorator) from the `mobservable-react` package does.
Given a react component class, it turns the `render` function into an observer while respecting the life-cycle system of React.
Let's rebuild our lolcatz user interface by using some reactive React components:

```javascript
var observer = require('mobservable-react').observer;
var React = require('react');

var LolCatzOverview = observer(React.createClass({
	render: function() {
		var lolCatz = this.props.lolCatz;
		return <div>
			{ isLolCatzFanatic() ? <marquee>Lolcatz!</marquee> : null }
			<h1>Favorite:</h1>
			<img src={ lolCatz.favoriteLolcat.url } />
			<h2>Runner ups:</h2>
			<ul>
			{ lolCatz.lolcatz.map(function(lolcat, index) {
				return <li key={ index }>
					<LolCat cat={ lolcat } />
				</li>
			}) }
			</ul>
		</div>;
	}
}));

var LolCat = observer(React.createClass({
	render: function() {
		return <img src={ this.props.cat.url } />;
	}
}));

React.render(<LolCatzOverview lolCatz={ lolCatz } />, document.body);
```

So there we are, simple, straightforward reactive components that will render whenever needed.
These components have some interesting characteristics:

* Usually reactive components have _no state_. But you are still free to use state.
* `observer` doesn't require you to define which data you want to use, yet it offers more fine grained subscriptions compared to many higher order components as found in other frameworks.
* Reactive components only subscribe to the data structures that where actively used during the last render.
This means that you cannot under-subscribe or over-subscribe.
You can even use data in your rendering that will only be available at later moment in time.
This is ideal for asynchronously loading data.  
* The `render` method will react to any observable data structures, regardless whether data is passed in as `props` (recommended), is part of the `state`, is in instance properties or is accessed through the closure of the component.
* Reactive components implement `shouldComponentUpdate` so that children are not re-rendered unnecessary.
* Reactive components sideways load data; parent components won't re-render even when child components will.
* `observer` does not depend on React's _context_ system which has its own quirks.

## ES6

For ES6 users, components can also be declared using classes:
```javascript
@observer class MyComponent extends React.Component {
  /* .. */
}
```

## Summary

Use `observer` to turn React components into reactive components.
You can play with the above example and the examples from the previous paragraph in this [JSBin](http://jsbin.com/zayere/edit?js,console,output).
This concludes the introduction to the core concepts of Mobservable.
Just try it out!
Or read on for best practices on how to structure large scale applications.

Oh, did I mention the [Mobservable-React-DevTools](https://github.com/mweststrate/mobservable-react-devtools) yet?
It shows exactly when your components are rerendered and you can inspect the data dependencies of your components.
