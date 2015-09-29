# mobservable

<img src="https://mweststrate.github.io/mobservable/images/mobservable.png" align="right" width="120px" />

##### _Keeps views automatically in sync with state. Unobtrusively._

[![Build Status](https://travis-ci.org/mweststrate/mobservable.svg?branch=master)](https://travis-ci.org/mweststrate/mobservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/mobservable/badge.svg?branch=master&service=github)](https://coveralls.io/github/mweststrate/mobservable?branch=master)
[![mobservable channel on slack](https://img.shields.io/badge/slack-mobservable-blue.svg)](https://reactiflux.slack.com/messages/mobservable/)

<br/>
### New to Mobservable? Take the [five minute, interactive introduction](https://mweststrate.github.io/mobservable/getting-started.html)

## Introduction

Mobservable is a library to create reactive state and views. Mobservable updates views automatically when the state changes, and thereby achieves [inversion of control](https://en.wikipedia.org/wiki/Inversion_of_control). This has major benefits for the simplicity, maintainability and performance of your code. This is the promise of Mobservable:
* Write complex applications which unmatched simple code.
* Enable unobtrusive state management: be free to use mutable objects, cyclic references, classes and real references to store state.
* Write declarative views that track their own dependencies. No subscriptions, cursors or other redundant declarations to manage.
* Build [high performing](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) React applications without Flux or Immutable data structures.
* Predictable behavior: all views are updated synchronously and atomically.

## What others are saying...

> _Elegant! I love it!_
> &dash; Johan den Haan, CTO of Mendix

> _We ported the book Notes and Kanban examples to Mobservable. Check out [the source](https://github.com/survivejs/mobservable-demo) to see how this worked out. Compared to the original I was definitely positively surprised. Mobservable seems like a good fit for these problems._
> &dash; Juho Vepsäläinen, author of "SurviveJS - Webpack and React" and jster.net curator

> _Great job with Mobservable! Really gives current conventions and libraries a run for their money._
> &dash; Daniel Dunderfelt

> _I was reluctant to abandon immutable data and the PureRenderMixin, but I no longer have any reservations. I can't think of any reason not to do things the simple, elegant way you have demonstrated._
> &dash;David Schalk, fpcomplete.com

## The essentials

Mobservable can be summarized in two functions that will fundamentally simplify the way you write React applications. Lets take a look at this really really simple timer application:

```javascript
var timerData = {
  secondsPassed: 0
};

setInterval(function() {
  timerData.secondsPassed++;
}, 1000);

var Timer = React.createClass({
  render: function() {
    return (<span>Seconds passed: { this.props.timerData.secondsPassed } </span> )
  }
});

React.render(<Timer timerData={timerData} />, document.body);
```

So what will this app do? It does nothing! The timer increases every second, but the will UI never update. To fix that, we should force the UI to refresh somehow upon each interval.
But that is the kind of dependency we should avoid in our code. We shouldn't have to _pull_ data from our state to update the UI. Instead, the data structures should be in control and call the UI when it needs an update. The state should be _pushed_ throughout our application. This is called inversion of control.

We can apply two simple functions of Mobservable to achieve this.

### mobservable.makeReactive

The first function is `makeReactive`. It is the swiss knife of mobservable and  turns any data structure and function into its reactive counterpart. Objects, arrays, functions; they can all be made reactive. Reactiveness is contagious; new data that is put in reactive data will become reactive as well. To make our timer reactive, just change the first three lines of the code:

```javascript
var timerData = mobservable.makeReactive({
  secondsPassed: 0
});
```

### mobservableReact.reactiveComponent

The second important function is `reactiveComponent` from the `mobservable-react` package. It turns a Reactjs component into a reactive one, that responds automatically to changes in data that is used by its render method. It can be used to wrap any react component, either created by using ES6 classes or `createClass`. So to fix the example, just update the timer definition to:

```javascript
var Timer = mobservableReact.reactiveComponent(React.createClass{
  /** Omitted */
}));
```

Its as simple as that. The `Timer` will now automatically update each time `timerData.secondsPassed` is altered.
The actual interesting thing about these changes are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still treats `timerData` as a plain JS object.
* There is no state. Timer is still a dumb component.
* There is no magic context being passed through components.
* There are no subscriptions of any kind that need to be managed.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no forced UI update in our 'controller'.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else.

All this missing code... it will scale well into large code-bases!
It does not only work for plain objects, but also for arrays, functions, classes, deeply nested structures.

## Getting started

* `npm install mobservable --save`.
* For React apps `npm install mobservable-react --save` as well. You might also be interested in the [dev tools for React and Mobservable](https://github.com/mweststrate/mobservable-react-devtools).

## Resources

Fresh step-by-step documentation is [coming soon](https://github.com/mweststrate/mobservable/issues/7)!

* [Five minute interactive introducton to Mobservable and React](https://mweststrate.github.io/mobservable/getting-started.html)
* [API documentation](https://mweststrate.github.io/mobservable/refguide/api.html)
* [ES5, ES6, TypeScript syntax examples](https://github.com/mweststrate/mobservable/blob/master/docs/api.md)
* [TypeScript Typings](https://github.com/mweststrate/mobservable/blob/master/dist/mobservable.d.ts)

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

## Top level api

For the full api, see the [API documentation](https://mweststrate.github.io/mobservable/refguide/api.html).
This is an overview of most important functions available in the `mobservable` namespace:

**makeReactive(value, options?)**
Turns a value into a reactive array, object, function, value or a reactive reference to a value.

**reactiveComponent(reactJsComponent)**
Provided by the `mobservable-react` packaege, turns a ReactJS component into a reactive one, that automatically re-renders if any reactive data that it uses is changed.

**extendReactive(target, properties)**
Extends an existing object with reactive properties.

**observe(function)**
Similar to `makeReactive(function)`. Exception the created reactive function will not be lazy, so that it is executed even when it has no observers on its own.
Useful to bridge reactive code to imperative code.

## Runtime behavior

* Reactive views always update synchronously (unless `transaction is used`)
* Reactive views always update atomically, intermediate values will never be visible.
* Reactive functions evaluate lazily and are not processed if they aren't observed.
* Dependency detection is based on actual values to real-time minify the amount of dependencies.
* Cycles are detected automatically.
* Exceptions during computations are propagated to consumers.

## Roadmap

* Write documentation, including how to organize projects
* Write blog about inner workings
* Introduce options for asynchronous views and structurally compare view results