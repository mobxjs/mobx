# Reactive React Components

We just saw how `sideEffect` can be used to create a view the automatically observes all reactive data structures it uses to trigger side effects eagerly.
What if the `render` methods of [React](https://facebook.github.io/react) components where side effects?
Then you would have a system that keeps the user interface actively in sync with the state, without ever [wasting](https://facebook.github.io/react/docs/perf.html#perf.printwastedmeasurements) a rendering.

That is exactly what the `reactiveComponent` function (and decorator) from the `mobservable-react` package does.
Given a react component class, it turns the `render` function into a `sideEffect` while respecting the lifecycle system of React.
Let's rebuild our lolcatz user interface using some React components:

```javascript
var reactiveComponent = require('mobservable-react').reactiveComponent;
var React = require('react');

var LolCatzOverview = reactiveComponent(React.createClass({
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

var LolCat = reactiveComponent(React.createClass({
	render: function() {
		return <img src={ this.props.cat.url } />;	
	}
}));

React.render(<LolCatzOverview lolCatz={ lolCatz } />, document.body);
```


* No state
* No context
* No configuration
* Won't unecessary render children
* Won't unecessary render parents

JSBin: http://jsbin.com/zayere/edit?js,console,output

plugins: ungrey, http://plugins.gitbook.com/plugin/jsfiddle http://plugins.gitbook.com/plugin/ga http://plugins.gitbook.com/plugin/jsbin http://plugins.gitbook.com/plugin/disqus


The `mobservable-react` package provides a simple function, `makeReactive` that accepts a React component and basically wraps `sideEffect` around it.
From there on, Mobservable will ensure that React components are updated automatically if any value that it uses is changed.
