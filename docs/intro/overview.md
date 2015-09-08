# The gist of Mobservable

So far it all might sound a bit fancy, but making an app reactive using Mobservable boils down to just these three steps:

## 1. Define State and make it Reactive

Store state in any data structure you like; objects, array, classes.
Cyclic data structures, references, it doesn't matter.
Just make sure that all properties that you want to change over time are marked by `mobservable` to make them reactive.

```javascript
var appState = mobservable.makeReactive({
    timer: 0
});
```

## 2. Create a View that responds to changes in the State

We didn't make our `appState` reactive just for nothing;
you can now create views that automatically update whenever relevant data in the `appState` changes.
Mobservable will find the minimal way to update your views.
This single fact saves you ton's of boilerplate and is [wickedly efficient](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

Generally speaking any function can become a reactive view, and Mobservable can be applied in any ES5 conformant JavaScript environment.
But here is an example of a view in the form of a React component.

```javascript
var TimerView = mobservable.reactiveComponent(React.createClass({
    render: function() {
        return (<button onClick={this.onReset}>
                Seconds passed: {this.props.appState.timer}
            </button>);
    },

    onReset: function() {
        this.props.appState.resetTimer();
    }
}));

React.render(<TimerView appState={appState} />, document.body);
```

(For the implementation of `resetTimer` function see the next section)

## 3. Modify the State

The third relevant thing to do is modifying the state.
That is what your app is about after all.
Now, unlike many other frameworks, Mobservable doesn't dictate you how to do this (but there are best practices).
But remember, the key thing here is: Mobservable helps you to do things in a simple straightforward way.

The following code will alter your data every second, and the UI will update automatically when needed.
No explicit relations are defined in either in the controller functions that _change_ the state or in the views that should _update_.
Decorating your _state_ and _views_ with `makeReactive` is enough for Mobservable to detect all relationships.
Here are two examples of changing the state:

```javascript
appState.resetTimer = function() {
    appState.timer = 0;
};

setInterval(function() {
    appState.timer += 1;
}, 1000);
```

Feel free to try this example on [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/) or by cloning the [Mobservable boilerplate project](https://github.com/mweststrate/mobservable-react-boilerplate)
