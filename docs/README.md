# Introduction

Maintainability through simplicity is the most important<sup>1</sup> chararactertic of a code base.
Especially in the areas that makes your app unique among its competitors; your clever business logic and your sophisticated user interface. 
The sole purpose of Mobservable is to simplify your code-base to be able to quickly iterate on the essential complexity<sup>2</sup> of your application.

To help you to achieve simplicity Mobservable can do two things for you:
1. Turn existing mutable data structures into observable data structures.
2. Help you creating views that update automatically whenever the relevant parts of these structures changes.

That might sound a bit fancy, but making an app reactive boils down to just these three simple steps:

#### 1. Define your State and make it Reactive

Store state in any data structure you like; objects, array, classes.
Cyclic data structures, references, it doesn't matter.
Just make sure that all properties that you want to change over time are marked by `mobservable` to make them reactive.

```javascript
var appState = mobservable.makeReactive({
    timer: 0
});
```

### 2. Create a View that responds to changes in the State

We didn't make our `appState` reactive just for nothing;
we can now create views that automatically update whenever relevant data in the `appState` changes.
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

### 3. Modify your state

The third relevant thing to do is to modifying the state.
That is what your app is all about after all.
Now, unlike many other frameworks, Mobservable doesn't dictate you how to do this (but there are best practices).
Remember, the key thing here is: keep things simple.

The following code will alter your data every second, and the UI will update automatically when needed.
No explicit relations where defined either in the controller functions or on the component.
They were simply detected by Mobservable.

```
appState.resetTimer = function() {
    appState.timer = 0;
};

setInterval(function() {
    appState.timer += 1;
}, 1000);
```

You can play with this example yourself by in the following [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/).

# Summary

So that's all. Mobservable is a library to create reactive state and views.
Views that update when the state changes,
and thereby achieves [inversion of control](https://en.wikipedia.org/wiki/Inversion_of_control). 
This has major benefits for the simplicity,
maintainability and performance of your code. This is the promise of Mobservable:

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
>&dash;David Schalk, fpcomplete.com

----

1. [The best code is no code at all](http://blog.codinghorror.com/the-best-code-is-no-code-at-all/)
2. [No Silver Bullet — Essence and Accidents of Software Engineering](https://en.wikipedia.org/wiki/No_Silver_Bullet)
3. [Pure Rendering in the light of State and Time](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)
4. [Making React reactive: the pursuit of high performing, easily maintainable React apps](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)

