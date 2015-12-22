# Introduction

_Observable data. Reactive functions. Simple code._

![Mobservable + React](images/concept.png)

* [Mobservable on Github](https://github.com/mweststrate/mobservable)
* For the impatient: [Five minute interactive introduction to Mobservable](http://mweststrate.github.io/mobservable/getting-started.html)
* [Mobservable talk on Reactive2015](https://www.youtube.com/watch?v=FEwLwiizlk0)

## Introduction

Mobservable enables your data structures to become observable.
Next to that it can make your functions (or [React components](https://github.com/mweststrate/mobservable-react)) reactive, so that they re-evaluate whenever relevant data is altered.
It's like Excel for JavaScript: any data structure can be turned into a 'data cell', and every function or user interface component can be turned into a 'formula' that updates automatically.
Mobservable is unopiniated about which data structures to use;
it can work with mutable objects, arrays, (cyclic) references, classes etc.
So that your actions, stores and user interface can remain KISS.
Besides that, it is [fast](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/).

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

Its as simple as that. In the example above the `Timer` will automatically update each time the property `timerData.secondsPassed` is altered.
The actual interesting thing about this approach are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still treats `timerData` as a plain JS object.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else (sideways data loading).
* There are no subscriptions of any kind that need to be managed.
* There is no forced UI update in our 'controller'.
* There is no state in the component. Timer is a dumb component.
* This approach is unobtrusive; you are not forced to apply certain techniques like keeping all data denormalized and immutable.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no magic context being passed through components.


## What others are saying...

> _Elegant! I love it!_
> &dash; Johan den Haan, CTO of Mendix

> _We ported the book Notes and Kanban examples to Mobservable. Check out [the source](https://github.com/survivejs/mobservable-demo) to see how this worked out. Compared to the original I was definitely positively surprised. Mobservable seems like a good fit for these problems._
> &dash; Juho Vepsäläinen, author of "SurviveJS - Webpack and React" and jster.net curator

> _Great job with Mobservable! Really gives current conventions and libraries a run for their money._
> &dash; Daniel Dunderfelt

> _I was reluctant to abandon immutable data and the PureRenderMixin, but I no longer have any reservations. I can't think of any reason not to do things the simple, elegant way you have demonstrated._
> &dash;David Schalk, fpcomplete.com
