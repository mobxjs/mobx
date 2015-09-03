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
To achieve this reactive programming principles are applied.
What this means is that the data relations<sup>3</sup> between `views` and `state` are detected automatically so that Mobservable can find the minimal way to update your views.
This single fact saves you ton's of boilerplate and is wickedly efficient<sup>4</sup>.

Generally speaking any function can become a reactive view.
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

Note that the implementation of `resetTimer` is provided in the next code block.

## 3. Modify the State

The third relevant thing to do is modifying the state.
That is what your app is about after all.
Now, unlike many other frameworks, Mobservable doesn't dictate you how to do this (but there are best practices).
But remember, the key thing here is: Mobservable helps you to keep things simple.

The following code will alter your data every second, and the UI will update automatically when needed.
No explicit relations are defined in either in the controller functions that _change_ the state or in the views that should _update_.
Decorating your _state_ and _views_ with `makeReactive` is enough for Mobservable to detect all relationships.
Here are two examples of state that was changed:

```javascript
appState.resetTimer = function() {
    appState.timer = 0;
};

setInterval(function() {
    appState.timer += 1;
}, 1000);
```

Feel free to try this example on [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/) or by cloning the [Mobservable boilerplate project](https://github.com/mweststrate/mobservable-react-boilerplate)
