<img src="docs/mobx.png" alt="logo" height="120" align="right" />
# MobX

_Simple, scalable state management_

[![Build Status](https://travis-ci.org/mobxjs/mobx.svg?branch=master)](https://travis-ci.org/mobxjs/mobx)
[![Coverage Status](https://coveralls.io/repos/mobxjs/mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/mobxjs/mobx?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![#mobx channel on reactiflux discord](https://img.shields.io/badge/discord-%23mobx%20%40reactiflux-blue.svg)](https://discord.gg/0ZcbPKXt5bYAa2J1)

* Installation: `npm install mobx --save`. React bindings: `npm install mobx-react --save`
* [Ten minute, interactive MobX + React tutorial](https://mobxjs.github.io/mobx/getting-started.html)
* Api documentation (including ES5, ES6, Typescript examples): https://mobxjs.github.io/mobx
* Videos: [Screencast: intro to MobX](https://www.youtube.com/watch?v=K8dr8BMU7-8) &mdash; State Management Is Easy, React Amsterdam 2016 conf (coming soon) ([slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx)) &mdash; [Transparent Reactive Programming and Mutable Data, Reactive2015 conf](https://www.youtube.com/watch?v=FEwLwiizlk0) ([slides](https://speakerdeck.com/mweststrate/react-transparent-reactive-programming-and-mutable-data-structures))

## Introduction

MobX is a battle tested library that makes state management simple and scalable by transparently applying functional reactive programming (TFRP).
The philosophy behind MobX is very simple:

_Everything that can be derived from the application state, should be derived. Automatically._

which includes the UI, data serialization, server communication, etc.

<img alt="MobX unidirectional flow" src="docs/flow.png" height="200" align="center" />

React and MobX together are a powerful combination. React renders the application state by providing mechanisms to translate it into a tree of renderable components. MobX provides the mechanism to store and update the application state that React then uses.

Both React and MobX provide very optimal and unique solutions to common problems in application development. React provides mechanisms to optimally render UI by using a virtual DOM that reduces the number of costly DOM mutations. MobX provides mechanisms to optimally synchronize application state with your React components by using a reactive virtual dependency state graph that is only updated when strictly needed and is never stale.

## Core concepts

MobX has a only few core concepts. The following snippets can be tried online using [JSFiddle](https://jsfiddle.net/mweststrate/wv3yopo0/) (or [without ES6 and JSX](https://jsfiddle.net/rubyred/3rL0183y/10/)).

### Observable state

MobX adds observable capabilities to existing data structures like objects, arrays and class instances. This can simply be done by annotating your class properties with the [@observable](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) decorator (ES2015), or by invoking the [`observable`](http://mobxjs.github.io/mobx/refguide/observable.html) or [`extendObservable`](http://mobxjs.github.io/mobx/refguide/extend-observable.html) functions (ES5). See [Language support](https://github.com/mobxjs/mobx/wiki/Language-Support) for language-specific examples.

```javascript
class Todo {
    id = Math.random();
    @observable title = "";
    @observable finished = false;
}
```

Using `@observable` is like turning a value into a spreadsheet cell. But unlike spreadsheets, these values can be not just primitive values, but references, objects and arrays as well. You can even [define your own](http://mobxjs.github.io/mobx/refguide/extending.html) observable data sources.

### Reactive derivations

With MobX you can simply define derived values that will update automatically when relevant data is modified. For example by using the [`@computed`](http://mobxjs.github.io/mobx/refguide/computed-decorator.html) decorator or by using parameterless functions as property values in `extendObservable`.

```javascript
class TodoList {
    @observable todos = [];
    @computed get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length;
    }
}
```
MobX will ensure that `unfinishedTodoCount` is updated automatically when a todo is added or when one of the `finished` properties is modified.
Computations like these can very well be compared with formulas in spreadsheet programs like MS Excel. They update automatically whenever, and only when, needed.

### Reactions

Reactions are similar to a computed value, but instead of producing a new value, a reaction produces a side effect for things like printing to the console, making network requests, incrementally updating the React component tree to patch the DOM, etc. In short, reactions bridge [reactive](https://en.wikipedia.org/wiki/Reactive_programming) and [imperative](https://en.wikipedia.org/wiki/Imperative_programming) programming.

If you are using React, you can turn your (stateless function) components into reactive components by simply adding the [`@observer`](http://mobxjs.github.io/mobx/refguide/observer-component.html) decorator from the `mobx-react` package onto them.

```javascript
import React, {Component} from 'react';
import {observer} from "mobx-react";

@observer
class TodoListView extends Component {
    render() {
        return <div>
            <ul>
                {this.props.todoList.todos.map(todo =>
                    <TodoView todo={todo} key={todo.id} />
                )}
            </ul>
            Tasks left: {this.props.todoList.unfinishedTodoCount}
        </div>
    }
}

const TodoView = observer(({todo}) =>
    <li>
        <input
            type="checkbox"
            checked={todo.finished}
            onClick={() => todo.finished = !todo.finished}
        />{todo.title}
    </li>
);

const store = new TodoList();
React.render(<TodoListView todoList={store} />, document.getElementById('mount'));
```

`observer` turns React (function) components into derivations of the data they render.

Also, reactions can be created using the [`autorun`](http://mobxjs.github.io/mobx/refguide/autorun.html), [`autorunAsync`](http://mobxjs.github.io/mobx/refguide/autorun-async.html) or [`when`](http://mobxjs.github.io/mobx/refguide/when.html) functions to fit your specific situations.

When using MobX there are no smart or dumb components.
All components render smartly but are defined in a dumb manner. MobX will simply make sure the components are always re-rendered whenever needed,
but also no more than that.
So the `onClick` handler in the above example will force the proper `TodoView` to render,
and it will cause the `TodoListView` to render if the number of unfinished tasks has changed.

However, if you would remove the `Tasks left` line (or put it into a separate component), the `TodoListView` will no longer re-render when ticking a box.
You can verify this yourself by changing the [JSFiddle](https://jsfiddle.net/mweststrate/wv3yopo0/).

### Actions

Unlike many flux frameworks, MobX is unopinionated about how user events should be handled.
This can be done in a Flux like manner.
Or by processing events using RxJS.
Or by simply handling events in the most straightforward way possible, as demonstrated in the above `onClick` handler.
In the end it all boils down to: Somehow the state should be updated.
After updating the state, `MobX` will take care of the rest, in an efficient, glitch-free manner.
So simple statements like below are enough to automatically update the user interface.
There is no technical need for firing events, calling dispatcher or what more.
A React component is in the end nothing more than a fancy representation of your state.
A derivation that will be managed by MobX.

```javascript
store.todos.push(
    new Todo("Get Coffee"),
    new Todo("Write simpler code")
);
store.todos[0].finished = true;
```

## MobX: Simple and scalable

MobX is one of the least obtrusive libraries you can use for state management. That makes the `MobX` approach not just simple, but very scalable as well:

### Using classes and real references
With MobX you don't need to normalize your data. This makes the library very suitable for very complex domain models (At Mendix for example ~500 different domain classes in a single application).

### Referential integrity is guaranteed
Since data doesn't need to be normalized, and MobX automatically tracks the relations between state and derivations, you get referential integrity for free. Rendering something that is accessed through three levels of indirection? No problem, MobX will track them and re-render whenever one of the references changes. As a result staleness bugs are a thing of the past. As a programmer you might forget that changing some data might influence a seemingly unrelated component in a corner case. MobX won't forget.

### Simpler actions are easier to maintain
As demonstrated above, modifying state when using MobX is very straightforward. You simply write down your intentions. MobX will take care of the rest.

### Fine grained observability is efficient
MobX builds a graph of all the derivations in your application to find the least number of re-computations that is needed to prevent staleness. "Derive everything" might sound expensive, MobX builds a virtual derivation graph to minimize the number of recomputations needed to keep derivations in sync with the state. In fact, when testing MobX at Mendix we found out that using this library to track the relations in our code is often a lot more efficient then pushing changes through our application by using handwritten events or "smart" selector based container components.
The simple reason is that MobX will establish far more fine grained 'listeners' on your data then you would do as a programmer.
Secondly MobX sees the causality between derivations so it can order them in such a way that no derivation has to run twice or introduces a glitch.
How that works? See this [in-depth explanation of MobX](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).

### Easy interoperability
MobX works plain javascript structures. Due to it's unobtrusiveness it works with most javascript libraries out of the box, without needing MobX specific library flavors.
So you can simple keep using your existing router-, data fetching and utility libraries like `react-router`, `director`, `superagent`, `lodash` etc.
For the same reason you can use it out of the box both server- and client side, in isomorphic applications and with react-native.
The result of this is that you often need to learn less new concepts when using MobX in comparison to other state management solutions.

## Credits

MobX is inspired by reactive programming principles as found in spreadsheets. It is inspired by MVVM frameworks like in MeteorJS tracker, knockout and Vue.js. But MobX brings Transparent Functional Reactive Programming to the next level and provides a stand alone implementation. It implements TFRP in a glitch-free, synchronous, predictable and efficient manner.

A ton of credits for [Mendix](https://github.com/mendix), for providing the flexibility and support to maintain MobX and the chance to proof the philosophy of MobX in a real, complex, performance critical applications.

And finally kudo's for all the people that believed in, tried and validated MobX.

## Further resources and documentation

### Get Started
* [Getting Started](https://mobxjs.github.io/mobx/getting-started.html) Ten minute, interactive introduction (with just ES5)
* [Full API documentation](http://mobxjs.github.io/mobx/)
* [react-mobservable-boilerplate](https://github.com/mweststrate/react-mobservable-boilerplate) Clone the boilerplate repository containing the above example 
* [MobX Github](https://github.com/mobxjs) Further boilerplate and example projects for ES5, Babel and Typescript can be found in the  organization on github

### Blogs & Videos
* [Screencast: intro to MobX](https://www.youtube.com/watch?v=K8dr8BMU7-8) State Management Is Easy, React Amsterdam 2016 conf (coming soon) ([slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx))
* [Reactive 2015 Conference](https://www.youtube.com/watch?v=FEwLwiizlk0) Talk on MobX (mobservable): React, transparent reactive programming and mutable data structures ([slides](https://speakerdeck.com/mweststrate/react-transparent-reactive-programming-and-mutable-data-structures))
* [Making React reactive: the pursuit of high performing, easily maintainable React apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)
* [Becoming fully reactive: an in-depth explanation of MobX](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.a2j1rww8g)
* [Pure rendering in the light of time and state](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)
* [MobX Interview](http://survivejs.com/blog/mobx-interview/) SurviveJS interview on MobX, React and Flux

### Related projects
* [mobx-connect](https://github.com/nightwolfz/mobx-connect) MobX @connect decorator for react components. Similar to redux's @connect.
* [rfx-stack](https://github.com/foxhound87/rfx-stack) RFX Stack - Universal App featuring: React + Feathers + MobX
* [mobx-reactor](https://github.com/amsb/mobx-reactor) Connect MobX data stores to functional stateless React components with async actions and unidirectional data flow.
* [mobx-model](https://github.com/ikido/mobx-model) Simplify mobx data stores that mimic backend models 
* [rx-mobx](https://github.com/chicoxyzzy/rx-mobx) Convert Mobx observables to RxJS and vice versa
* [mobx-store](https://github.com/AriaFallah/mobx-store) A lowdb inspired data store with declarative querying, observable state, and easy undo/redo.
* [reaxor](https://github.com/KadoBOT/reaxor) Boilerplate for better state management, styling, testing and cleaner code
* [Smalldots MobX Store](https://github.com/smalldots/mobx-store) Store API for MobX

_Feel free to create a PR to add your own!_

### More examples
* [mobx-react-todomvc](https://github.com/mobxjs/mobx-react-todomvc) TodoMVC reference implementation on top of react-mobx-boilerplate
* [mobx-react-typescript](https://github.com/contacts-mvc/mobx-react-typescript) An example project using Typescript
* [TodoMVC Benchmarking](https://github.com/mweststrate/mobx-todomvc)
* [mobservable-demo](https://github.com/survivejs/mobservable-demo) The ports of the _Notes_ and _Kanban_ examples from the book "SurviveJS - Webpack and React" to mobservable.
* [react-particles-experiment](https://github.com/mobxjs/react-particles-experiment) MobX port of React-Particles-Experiment, showing MobX + Flux action dispatching
* A simple webshop using [React + mobx](https://jsfiddle.net/mweststrate/46vL0phw) or [JQuery + mobx](http://jsfiddle.net/mweststrate/vxn7qgdw).
* [Simple timer](https://jsfiddle.net/mweststrate/wgbe4guu/) application in JSFiddle.

## What others are saying...

> _Elegant! I love it!_
> &dash; Johan den Haan, CTO of Mendix

> _We ported the book Notes and Kanban examples to MobX. Check out [the source](https://github.com/survivejs-demos/mobx-demo) to see how this worked out. Compared to the original I was definitely positively surprised. MobX seems like a good fit for these problems._
> &dash; Juho Vepsäläinen, author of "SurviveJS - Webpack and React" and jster.net curator

> _Great job with MobX! Really gives current conventions and libraries a run for their money._
> &dash; Daniel Dunderfelt

> _I was reluctant to abandon immutable data and the PureRenderMixin, but I no longer have any reservations. I can't think of any reason not to do things the simple, elegant way you have demonstrated._
> &dash;David Schalk, fpcomplete.com

More testimonials from people using MobX in production can be found on [medium: functional reactive flux blog](https://medium.com/@kenneth_chau/the-2-fundamental-laws-of-flux-and-the-functional-reactive-flux-c9368ac008d3#.h41y0i22h), [hacker news](https://news.ycombinator.com/item?id=11181980), [reddit 1](https://www.reddit.com/r/reactjs/comments/46m2zg/has_anybody_used_mobservable_for_their_react/), [reddit 2](https://www.reddit.com/r/javascript/comments/47omi9/mobx_20_previously_mobservable_has_been_released/) or on twitter under the [#mobx](https://twitter.com/search?q=mobx&src=typd) tag.

## Contributing

* Feel free to send pull requests.
* Use `npm test` to run the basic test suite, `npm run coverage` for the test suite with coverage and `npm run perf` for the performance tests.

## Bower support

Bower support is available through the infamous npmcdn.com:
`bower install https://npmcdn.com/mobx/bower.zip`

Then use `lib/mobx.umd.js` or `lib/mobx.umd.min.js`

## MobX was formerly known as Mobservable.
See the [changelog](https://github.com/mobxjs/mobx/blob/master/CHANGELOG.md#200) for all the details about `mobservable` to `mobx`.

