# mobservable


<img src="https://mweststrate.github.io/mobservable/images/mobservable.png" align="right" width="120px" />

##### _Observable data. Reactive functions. Simple code._

[![Build Status](https://travis-ci.org/mweststrate/mobservable.svg?branch=master)](https://travis-ci.org/mweststrate/mobservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/mobservable/badge.svg?branch=master&service=github)](https://coveralls.io/github/mweststrate/mobservable?branch=master)
[![Join the chat at https://gitter.im/mweststrate/mobservable](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mweststrate/mobservable?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![#mobservable channel on reactiflux discord](https://img.shields.io/badge/discord-%23mobservable%20%40reactiflux-blue.svg)](https://discord.gg/0ZcbPKXt5bYAa2J1)

<br/>
* New to Mobservable? Take the [five minute, interactive introduction](https://mweststrate.github.io/mobservable/getting-started.html)
* [Official documentation](https://mweststrate.github.io/mobservable/)
* Mobservable talk on [Reactive2015](https://www.youtube.com/watch?v=FEwLwiizlk0)


## Introduction

Mobservable enables your data structures to become observable.
Next to that it can make your functions (or [React components](https://github.com/mweststrate/mobservable-react)) reactive, so that they re-evaluate whenever relevant data is altered. 
It's like Excel for JavaScript: any data structure can be turned into a 'data cell', and every function or user interface component can be turned into a 'formula' that updates automatically.
Mobservable is unopiniated about which data structures to use;
it can work with mutable objects, arrays, (cyclic) references, classes etc.
So that your actions, stores and user interface can remain KISS.
Besides that, it is [fast](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

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

In the example above the `timerData` data structure is made observable and the `Timer` component is turned into an `observer`.
Mobservable will automatically track all relations between _observable data_ and _observing functions (or components)_ so that the minimum amount of observers is updated to keep all observers fresh. 

Its as simple as that. In the example above the `Timer` will automatically update each time the property `timerData.secondsPassed` is altered. This is because setter notifies the Timer observer.
The actual interesting thing about this approach are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still treats `timerData` as a plain JS object.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else (sideways data loading).
* There are no subscriptions of any kind that need to be managed.
* There is no forced UI update in our 'controller'.
* There is no state in the component. Timer is a dumb component.
* This approach is unobtrusive; you are not forced to apply certain techniques like keeping all data denormalized and immutable.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no magic context being passed through components.

### Notice
Unlike Object.observe, you cannot track added properties. So remeber to initialize any property you want to observe. Null values work if you don't have any value yet. 
Observing added properties is impossible to achieve without native Proxy support or dirty checking.

## Getting started

* `npm install mobservable --save`.
* For (Native) React apps `npm install mobservable-react --save` as well. You might also be interested in the [dev tools for React and Mobservable](https://github.com/mweststrate/mobservable-react-devtools).
* [Five minute interactive introduction to Mobservable and React](https://mweststrate.github.io/mobservable/getting-started.html)

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
* Use `npm test` to run the basic test suite, `npm run converage` for the test suite with coverage and `npm run perf` for the performance tests.
