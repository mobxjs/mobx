# mobservable

<img src="https://mweststrate.github.io/mobservable/images/mobservable.png" align="right" width="120px" />

##### _Observable data. Reactive functions. Simple code._

[![Build Status](https://travis-ci.org/mweststrate/mobservable.svg?branch=master)](https://travis-ci.org/mweststrate/mobservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/mobservable/badge.svg?branch=master&service=github)](https://coveralls.io/github/mweststrate/mobservable?branch=master)
[![mobservable channel on slack](https://img.shields.io/badge/slack-mobservable-blue.svg)](https://reactiflux.slack.com/messages/mobservable/)

<br/>
* New to Mobservable? Take the [five minute, interactive introduction](https://mweststrate.github.io/mobservable/getting-started.html)
* [Official documentation](https://mweststrate.github.io/mobservable/)

## Introduction

Mobservable enables your data structures to become observable.
Next to that it can make your functions (or [React components](https://github.com/mweststrate/mobservable-react)) reactive, so that they re-evaluate whenever relevant data is altered. 
It's like Excel for JavaScript: any data structure can be turned into a 'data cell', any function into a 'formula' that updates automatically.

This has major benefits for the simplicity, maintainability and performance of your code:
* Write complex applications which unmatched simple code.
* Enable unopiniated state management: be free to use mutable objects, cyclic references, classes and real references to store state.
* Write declarative views that track their own dependencies. No subscriptions, cursors or other redundant declarations to manage.
* Build [high performing](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) React applications without Flux or Immutable data structures.
* Predictable behavior: all views are updated synchronously and atomically.

## The essentials

Mobservable can be summarized in two functions that will fundamentally simplify the way you write React applications.
Let's start by building a really really simple timer application:

```javascript
var timerData = mobservable.observable({
  secondsPassed: 0
});

setInterval(function() {
  timerData.secondsPassed++;
}, 1000);

var Timer = mobservable.observer(React.createClass({
  render: function() {
    return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
  }
}));

React.render(<Timer timerData={timerData} />, document.body);
```

Without Mobservable, this app would do nothing beyond the initial render.
The timer would increase every second, but the would UI never update. 
To fix that, your code should trigger the UI to update each time the `timerData` changes.
But there is a better way.
We shouldn't have to _pull_ data from our state to update the UI.
Instead, the data structures should be in control and call the UI whenever it becomes stale.
The state should be _pushed_ throughout our application. 

In the example above this is achieved by making the `timerDate` observable and by turning the `Timer` component into an `observer`.
Mobservable will automatically track all relations between _observable data_ and _observing functions (or components)_ so that the minum amount of observers is updated to keep all observers fresh. 


Its as simple as that. In the example above the `Timer` will automatically update each time the property `timerData.secondsPassed` is altered.
The actual interesting thing about this approach are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still treats `timerData` as a plain JS object.
* There is no state. Timer is a dumb component.
* There is no magic context being passed through components.
* There are no subscriptions of any kind that need to be managed.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no forced UI update in our 'controller'.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else.

All this missing code... it will scale well into large code-bases!
It does not only work for plain objects, but also for arrays, functions, classes, deeply nested structures.

## Getting started

* `npm install mobservable --save`.
* For (Native) React apps `npm install mobservable-react --save` as well. You might also be interested in the [dev tools for React and Mobservable](https://github.com/mweststrate/mobservable-react-devtools).
* [Five minute interactive introducton to Mobservable and React](https://mweststrate.github.io/mobservable/getting-started.html)

## Examples

* Online: Live edit the Todo example from the [introduction](https://mweststrate.github.io/mobservable/getting-started.html#demo).
* Online: Simple timer example on [JSFiddle](https://jsfiddle.net/mweststrate/wgbe4guu/).
* Repo: [Minimal boilerplate repostory](https://github.com/mweststrate/mobservable-react-boilerplate).
* Repo: [Full TodoMVC implementation](https://github.com/mweststrate/mobservable-react-todomvc).
* External example: The ports of the _Notes_ and _Kanban_ [examples of the "SurviveJS - Webpack and React"](https://github.com/survivejs/mobservable-demo).

## Philosophy

* [Official homepage introduction](http://mweststrate.github.io/mobservable/)
* [Making React reactive: the pursuit of high performing, easily maintainable React apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)
* [SurviveJS interview on Mobservable, React and Flux](http://survivejs.com/blog/mobservable-interview/)
* [Pure rendering in the light of time and state](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)

Mobservable is inspired by Microsoft Excel and existing TFRP implementations like MeteorJS tracker, knockout and Vue.js.

## Top level api

For the full api, see the [API documentation](https://mweststrate.github.io/mobservable/refguide/observable.html).
This is an overview of most important functions available in the `mobservable` namespace:

**observable(value, options?)**
The `observable` function is the swiss knife of mobservable and enriches any data structure or function with observable capabilities. 

**autorun(function)**
Turns a function into an observer so that it will automatically be re-evaluated if any data values it uses changes.

**observer(reactJsComponent)**
The `observer` function (and ES6 decorator) from the `mobservable-react` turns any Reactjs component into a reactive one.
From there on it will responds automatically to any relevant change in _observable_ data that was used by its render method.

## What others are saying...

> _Elegant! I love it!_
> &dash; Johan den Haan, CTO of Mendix

> _We ported the book Notes and Kanban examples to Mobservable. Check out [the source](https://github.com/survivejs/mobservable-demo) to see how this worked out. Compared to the original I was definitely positively surprised. Mobservable seems like a good fit for these problems._
> &dash; Juho Vepsäläinen, author of "SurviveJS - Webpack and React" and jster.net curator

> _Great job with Mobservable! Really gives current conventions and libraries a run for their money._
> &dash; Daniel Dunderfelt

> _I was reluctant to abandon immutable data and the PureRenderMixin, but I no longer have any reservations. I can't think of any reason not to do things the simple, elegant way you have demonstrated._
> &dash;David Schalk, fpcomplete.com

## Contributing

* Feel free to send pr requests.
* Use `npm start` to run the basic test suite, `npm test` for the test suite with coverage and `npm run perf` for the performance tests.
