# mobservable

<img src="https://mweststrate.github.io/mobservable/images/mobservable.png" align="right" width="120px" />


##### _Unobtrusive library that keeps data automatically in sync with views._

[![Build Status](https://travis-ci.org/mweststrate/mobservable.svg?branch=master)](https://travis-ci.org/mweststrate/mobservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/mobservable/badge.svg?branch=master&service=github)](https://coveralls.io/github/mweststrate/mobservable?branch=master)
[![mobservable channel on slack](https://img.shields.io/badge/slack-mobservable-blue.svg)](http://www.reactiflux.com)


## Philosophy


The goal of mobservable is simple:

1. Write simple views. That assume data is always passed in explicitly.
2. Write simple controllers and stores. Change data without thinking about what views should be updated.
3. Use the data concepts that you need or like: objects, arrays, classes, real references, cyclic data structures.
4. Data and controllers should not know about the fact whether their data is used in a view or not.
4. Performance: mobservable finds the minimum amount of updates that your views need. Performance is no longer only a privilege for those who use treat their data as  immutable.
5. Don't worry about staleness: mobservable makes sure all updates are processed atomically.
1. Mobservabe is *not* a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.
1. Mobservable is framework agnostic and can be applied in any JS environment. It ships with a small function to transform Reactjs components into reactive view functions.

Mobservable is born as part of an enterprise scale visual editor,
which needs high performance rendering and cover over 400 different domain concepts. So the best performance and the simplest possible controller and view code are both of the utmost performance.
See [Making React reactive: the pursuit of high performing, easily maintainable React apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) for more details about that journey.
Mobservable applies reactive programming behind the scenes and is inspired by MVVM frameworks like knockout and ember, yet simpler to use.

## The essentials

Mobservable can be summarized in two functions that will fundamentally simplify the way you write Reactjs applications. Lets take a look at this really really simple timer application:

```javascript
var timerData = {
  secondsPassed: 0
};

setInterval(function() {
  this.timerData.secondsPassed++;
}, 1000);

var Timer = React.createClass({
  render: function() {
    return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
  }
});

React.render(<Timer timerData={timerData} />, document.body);
```

So what will this app do? It does nothing! The timer increases every second, but the UI never responds to that. After the interval updates the timer we should force the UI to update.
But that is the kind of dependency we want to avoid in our code. So let's apply two simple functions of mobservable instead to fix this issue:

### mobservable.makeReactive

The first function is `makeReactive(data)`. It is the swiss knife of mobservable and  turns any data structure and function into its reactive counterpart. Objects, arrays, functions; they can all be made reactive. Reactiveness is infectious; new data that is put in reactive data will become reactive as well. To make our timer reactive, just change the first three lines of the code:

```javascript
var timerData = mobservable.makeReactive({
  secondsPassed: 0
});
```

### mobservable.reactiveComponent

The second important function is `reactiveComponent`. It turns a Reactjs component into a reactive one, that responds automatically to changes in data that is used by its render method. It can be used to wrap any react component, either created by using ES6 classes or `createClass`. So to fix the example, just update the timer definition to:

```javascript
var Timer = mobservable.reactiveComponent(React.createClass{
  /** Omitted */
}));
```

Thats all folks! Its as simple as that. And it does not just work plain objects, but also for arrays, functions, classes, deeply nested structures. The actual interesting thing about these changes are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still threads `timerData` as a plain JS object.
* There is no state. Timer is still a dump component.
* There is no magic context being passed through components.
* There are no subscriptions of any kind that need to be managed.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no forced UI update in our 'controller'.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else.

<img src="https://mweststrate.github.io/mobservable/images/overview.png" align="center" height="300"/>


## A Todo application

The following simple todo application can be found up & running on https://mweststrate.github.io/mobservable. A full TodoMVC implementation can be found [here](https://github.com/mweststrate/todomvc/tree/master/examples/react-mobservable)
