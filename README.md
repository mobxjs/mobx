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
>&dash;David Schalk

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

### mobservable.reactiveComponent

The second important function is `reactiveComponent`. It turns a Reactjs component into a reactive one, that responds automatically to changes in data that is used by its render method. It can be used to wrap any react component, either created by using ES6 classes or `createClass`. So to fix the example, just update the timer definition to:

```javascript
var Timer = mobservable.reactiveComponent(React.createClass{
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

Either:
* `npm install mobservable --save`
* [Edit](https://mweststrate.github.io/mobservable/getting-started.html#demo) a simple ToDo application online.
* Clone the boilerplate repository containing the above example from: https://github.com/mweststrate/react-mobservable-boilerplate.
* Or fork this [JSFiddle](https://jsfiddle.net/mweststrate/wgbe4guu/).

## Resources

* [Five minute interactive introducton to Mobservable and React](https://mweststrate.github.io/mobservable/getting-started.html)
* [API documentation](https://github.com/mweststrate/mobservable/blob/master/docs/api.md)
* [Tips & Tricks](https://github.com/mweststrate/mobservable/blob/master/docs/syntax.md)
* [ES5, ES6, TypeScript syntax examples](https://github.com/mweststrate/mobservable/blob/master/docs/api.md)
* [TypeScript Typings](https://github.com/mweststrate/mobservable/blob/master/dist/mobservable.d.ts)

## More examples

* The [ports of the _Notes_ and _Kanban_ examples](https://github.com/survivejs/mobservable-demo) from the book "SurviveJS - Webpack and React" to mobservable.
* A simple webshop using [React + mobservable](https://jsfiddle.net/mweststrate/46vL0phw) or [JQuery + mobservable](http://jsfiddle.net/mweststrate/vxn7qgdw).
* [Simple timer](https://jsfiddle.net/mweststrate/wgbe4guu/) application in JSFiddle.
* [TodoMVC](https://rawgit.com/mweststrate/todomvc/immutable-to-observable/examples/react-mobservable/index.html#/), based on the ReactJS TodoMVC.

## Philosophy

* [Making React reactive: the pursuit of high performing, easily maintainable React apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)
* [SurviveJS interview on Mobservable, React and Flux](http://survivejs.com/blog/mobservable-interview/)
* [Pure rendering in the light of time and state](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)
* [Official homepage](http://mweststrate.github.io/mobservable/)


## Top level api

For the full api, see the [API documentation](https://github.com/mweststrate/mobservable/blob/master/docs/api.md).
This is an overview of most important functions available in the `mobservable` namespace:

**makeReactive(value, options?)**
Turns a value into a reactive array, object, function, value or a reactive reference to a value.

**reactiveComponent(reactJsComponent)**
Turns a ReactJS component into a reactive one, that automatically re-renders if any reactive data that it uses is changed.

**extendReactive(target, properties)**
Extends an existing object with reactive properties.

**sideEffect(function)**
Similar to `makeReactive(function)`. Exception the created reactive function will not be lazy, so that it is executed even when it has no observers on its own.
Useful to bridge reactive code to imperative code.

## Runtime behavior

* Reactive views always update synchronously (unless `transaction is used`)
* Reactive views always update atomically, intermediate values will never be visible.
* Reactive functions evaluate lazily and are not processed if they aren't observed.
* Dependency detection is based on actual values to real-time minify the amount of dependencies.
* Cycles are detected automatically.
* Exceptions during computations are propagated to consumers.

## FAQ

##### Which browsers are supported?

Mobservable runs on any ES5 environment. That means that all browsers except IE8, Node.js and Rhine are supported. See [caniuse.com](http://caniuse.com/#feat=es5)

##### Is mobservable a framework?

Mobservabe is *not* a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.

##### Can I combine flux with mobservable?

Flux implementations that do not work on the assumption that the data in their stores is immutable should work well with mobservable.
However, the need for flux is less when using mobservable.
Mobservable already optimizes rendering and since it works with most kinds of data, including cycles and classes.
So other programming paradigms like classic MVC are now can be easily applied in applications that combine ReactJS with mobservable.

##### Can I use mobservable together with framework X?

Probably.
Mobservable is framework agnostic and can be applied in any JS environment.
It just ships with a small function to transform Reactjs components into reactive view functions for convenience.
Mobservable works just as well server side, and is already combined with JQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b).

##### Why should I use Mobservable instead of reactive library X?

See: https://github.com/mweststrate/mobservable/issues/18

##### Can I record states and re-hydrate them?

Yes, some examples are coming shortly!

##### Can you tell me how it works?

Sure, join the reactiflux channel our checkout [dnode.ts](lib/dnode.ts). Or, submit an issue to motivate me to make some nice drawings :).
