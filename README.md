<img src="docs/mobx.png" alt="logo" height="120" align="right" />
# MobX

_Simple, scalable state management_

[![Build Status](https://travis-ci.org/mobxjs/mobx.svg?branch=master)](https://travis-ci.org/mobxjs/mobx)
[![Coverage Status](https://coveralls.io/repos/mobxjs/mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/mobxjs/mobx?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Discuss MobX on Hashnode](https://hashnode.github.io/badges/mobx.svg)](https://hashnode.com/n/mobx)
[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://mobxjs.github.io/mobx/donate.html)
[![OpenCollective](https://opencollective.com/mobx/backers/badge.svg)](#backers)
[![OpenCollective](https://opencollective.com/mobx/sponsors/badge.svg)](#sponsors)

![npm install mobx](https://nodei.co/npm/mobx.png?downloadRank=true&downloads=true)

* Installation: `npm install mobx --save`. React bindings: `npm install mobx-react --save`. To enable ESNext decorators (optional), see below.
* CDN:
- https://unpkg.com/mobx/lib/mobx.umd.js
- https://cdnjs.com/libraries/mobx

## Getting started

* [Ten minute, interactive MobX + React tutorial](https://mobxjs.github.io/mobx/getting-started.html)
* [Official MobX 3 documentation and API overview](https://mobxjs.github.io/mobx/refguide/api.html) ([MobX 2](https://github.com/mobxjs/mobx/blob/7c9e7c86e0c6ead141bb0539d33143d0e1f576dd/docs/refguide/api.md))
* Videos:
  * [Egghead.io course: Manage Complex State in React Apps with MobX](https://egghead.io/courses/manage-complex-state-in-react-apps-with-mobx) - 30m.
  * [ReactNext 2016: Real World MobX](https://www.youtube.com/watch?v=Aws40KOx90U) - 40m [slides](https://docs.google.com/presentation/d/1DrI6Hc2xIPTLBkfNH8YczOcPXQTOaCIcDESdyVfG_bE/edit?usp=sharing)
  * [Practical React with MobX](https://www.youtube.com/watch?v=XGwuM_u7UeQ). In depth introduction and explanation to MobX and React by Matt Ruby on OpenSourceNorth (ES5 only) - 42m.
  * LearnCode.academy MobX tutorial [Part I: MobX + React is AWESOME (7m)](https://www.youtube.com/watch?v=_q50BXqkAfI) [Part II: Computed Values and Nested/Referenced Observables (12m.)](https://www.youtube.com/watch?v=nYvNqKrl69s)
  * [Screencast: intro to MobX](https://www.youtube.com/watch?v=K8dr8BMU7-8) - 8m
  * [Talk: State Management Is Easy, React Amsterdam 2016 conf](https://www.youtube.com/watch?v=ApmSsu3qnf0&feature=youtu.be) ([slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx))
* [Boilerplates and related projects](http://mobxjs.github.io/mobx/faq/boilerplates.html)
* More tutorials, blogs and videos can be found on the [MobX homepage](http://mobxjs.github.io/mobx/faq/blogs.html)


## Introduction

MobX is a battle tested library that makes state management simple and scalable by transparently applying functional reactive programming (TFRP).
The philosophy behind MobX is very simple:

_Anything that can be derived from the application state, should be derived. Automatically._

which includes the UI, data serialization, server communication, etc.

<img alt="MobX unidirectional flow" src="docs/flow.png" align="center" />

React and MobX together are a powerful combination. React renders the application state by providing mechanisms to translate it into a tree of renderable components. MobX provides the mechanism to store and update the application state that React then uses.

Both React and MobX provide very optimal and unique solutions to common problems in application development. React provides mechanisms to optimally render UI by using a virtual DOM that reduces the number of costly DOM mutations. MobX provides mechanisms to optimally synchronize application state with your React components by using a reactive virtual dependency state graph that is only updated when strictly needed and is never stale.

## Core concepts

MobX has only a few core concepts. The following snippets can be tried online using [JSFiddle](https://jsfiddle.net/mweststrate/wv3yopo0/) (or [without ES6 and JSX](https://jsfiddle.net/rubyred/55oc981v/)).

### Observable state

MobX adds observable capabilities to existing data structures like objects, arrays and class instances.
This can simply be done by annotating your class properties with the [@observable](http://mobxjs.github.io/mobx/refguide/observable-decorator.html) decorator (ES.Next).

```javascript
class Todo {
    id = Math.random();
    @observable title = "";
    @observable finished = false;
}
```

Using `observable` is like turning a property of an object into a spreadsheet cell.
But unlike spreadsheets, these values cannot just be primitive values, but also references, objects and arrays.
You can even [define your own](http://mobxjs.github.io/mobx/refguide/extending.html) observable data sources.

### Intermezzo: Using MobX in ES5, ES6 and ES.next environments

If these `@` thingies look alien to you, these are ES.next decorators.
Using them is entirely optional in MobX. See the [documentation](http://mobxjs.github.io/mobx/best/decorators.html) for details how to either use or avoid them.
MobX runs on any ES5 environment, but leveraging ES.next features like decorators are the cherry on the pie when using MobX.
The remainder of this readme uses decorators, but remember, _they are optional_.

For example, in good ol' ES5 the above snippet would look like:

```javascript
function Todo() {
    this.id = Math.random()
    extendObservable(this, {
        title: "",
        finished: false
    })
}
```

### Computed values

With MobX you can define values that will be derived automatically when relevant data is modified.
By using the [`@computed`](http://mobxjs.github.io/mobx/refguide/computed-decorator.html) decorator or by using getter / setter functions when using `(extend)Observable`.

```javascript
class TodoList {
    @observable todos = [];
    @computed get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length;
    }
}
```

MobX will ensure that `unfinishedTodoCount` is updated automatically when a todo is added or when one of the `finished` properties is modified.
Computations like these resemble formulas in spreadsheet programs like MS Excel. They update automatically and only when required.

### Reactions

Reactions are similar to a computed value, but instead of producing a new value, a reaction produces a side effect for things like printing to the console, making network requests, incrementally updating the React component tree to patch the DOM, etc.
In short, reactions bridge [reactive](https://en.wikipedia.org/wiki/Reactive_programming) and [imperative](https://en.wikipedia.org/wiki/Imperative_programming) programming.

#### React components
If you are using React, you can turn your (stateless function) components into reactive components by simply adding the [`observer`](http://mobxjs.github.io/mobx/refguide/observer-component.html) function / decorator from the `mobx-react` package onto them.

```javascript
import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react';

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
)

const store = new TodoList();
ReactDOM.render(<TodoListView todoList={store} />, document.getElementById('mount'));
```

`observer` turns React (function) components into derivations of the data they render.
When using MobX there are no smart or dumb components.
All components render smartly but are defined in a dumb manner. MobX will simply make sure the components are always re-rendered whenever needed, but also no more than that. So the `onClick` handler in the above example will force the proper `TodoView` to render, and it will cause the `TodoListView` to render if the number of unfinished tasks has changed.
However, if you would remove the `Tasks left` line (or put it into a separate component), the `TodoListView` will no longer re-render when ticking a box. You can verify this yourself by changing the [JSFiddle](https://jsfiddle.net/mweststrate/wv3yopo0/).

#### Custom reactions
Custom reactions can simply be created using the [`autorun`](http://mobxjs.github.io/mobx/refguide/autorun.html),
[`reaction`](http://mobxjs.github.io/mobx/refguide/reaction.html) or [`when`](http://mobxjs.github.io/mobx/refguide/when.html) functions to fit your specific situations.

For example the following `autorun` prints a log message each time the amount of `unfinishedTodoCount` changes:

```javascript
autorun(() => {
    console.log("Tasks left: " + todos.unfinishedTodoCount)
})
```

### What will MobX react to?

Why does a new message get printed each time the `unfinishedTodoCount` is changed? The answer is this rule of thumb:

_MobX reacts to any existing observable property that is read during the execution of a tracked function._

For an in-depth explanation about how MobX determines to which observables needs to be reacted, check [understanding what MobX reacts to](https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md).

### Actions

Unlike many flux frameworks, MobX is unopinionated about how user events should be handled.

* This can be done in a Flux like manner.
* Or by processing events using RxJS.
* Or by simply handling events in the most straightforward way possible, as demonstrated in the above `onClick` handler.

In the end it all boils down to: Somehow the state should be updated.

After updating the state `MobX` will take care of the rest in an efficient, glitch-free manner. So simple statements, like below, are enough to automatically update the user interface.

There is no technical need for firing events, calling a dispatcher or what more. A React component in the end is nothing more than a fancy representation of your state. A derivation that will be managed by MobX.

```javascript
store.todos.push(
    new Todo("Get Coffee"),
    new Todo("Write simpler code")
);
store.todos[0].finished = true;
```

Nonetheless, MobX has an optional built-in concept of [`actions`](https://mobxjs.github.io/mobx/refguide/action.html).
Use them to your advantage; they will help you to structure your code better and make wise decisions about when and where state should be modified.

## MobX: Simple and scalable

MobX is one of the least obtrusive libraries you can use for state management. That makes the `MobX` approach not just simple, but very scalable as well:

### Using classes and real references

With MobX you don't need to normalize your data. This makes the library very suitable for very complex domain models (At Mendix for example ~500 different domain classes in a single application).

### Referential integrity is guaranteed

Since data doesn't need to be normalized, and MobX automatically tracks the relations between state and derivations, you get referential integrity for free. Rendering something that is accessed through three levels of indirection?

No problem, MobX will track them and re-render whenever one of the references changes. As a result staleness bugs are a thing of the past. As a programmer you might forget that changing some data might influence a seemingly unrelated component in a corner case. MobX won't forget.

### Simpler actions are easier to maintain

As demonstrated above, modifying state when using MobX is very straightforward. You simply write down your intentions. MobX will take care of the rest.

### Fine grained observability is efficient

MobX builds a graph of all the derivations in your application to find the least number of re-computations that is needed to prevent staleness. "Derive everything" might sound expensive, MobX builds a virtual derivation graph to minimize the number of recomputations needed to keep derivations in sync with the state.

In fact, when testing MobX at Mendix we found out that using this library to track the relations in our code is often a lot more efficient then pushing changes through our application by using handwritten events or "smart" selector based container components.

The simple reason is that MobX will establish far more fine grained 'listeners' on your data then you would do as a programmer.

Secondly MobX sees the causality between derivations so it can order them in such a way that no derivation has to run twice or introduces a glitch.

How that works? See this [in-depth explanation of MobX](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).

### Easy interoperability

MobX works with plain javascript structures. Due to its unobtrusiveness it works with most javascript libraries out of the box, without needing MobX specific library flavors.

So you can simply keep using your existing router, data fetching, and utility libraries like `react-router`, `director`, `superagent`, `lodash` etc.

For the same reason you can use it out of the box both server and client side, in isomorphic applications and with react-native.

The result of this is that you often need to learn less new concepts when using MobX in comparison to other state management solutions.

---



<center>
<img src="https://www.mendix.com/styleguide/img/logo-mendix.png" align="center" width="200"/>

__MobX is proudly used in mission critical systems at [Mendix](https://www.mendix.com)__
</center>

## Credits

MobX is inspired by reactive programming principles as found in spreadsheets. It is inspired by MVVM frameworks like in MeteorJS tracker, knockout and Vue.js. But MobX brings Transparent Functional Reactive Programming to the next level and provides a stand alone implementation. It implements TFRP in a glitch-free, synchronous, predictable and efficient manner.

A ton of credits for [Mendix](https://github.com/mendix), for providing the flexibility and support to maintain MobX and the chance to proof the philosophy of MobX in a real, complex, performance critical applications.

And finally kudos for all the people that believed in, tried, validated and even [sponsored](https://github.com/mobxjs/mobx/blob/master/sponsors.md) MobX.

## Further resources and documentation

* [MobX homepage](http://mobxjs.github.io/mobx/faq/blogs.html)
* [API overview](http://mobxjs.github.io/mobx/refguide/api.html)
* [Tutorials, Blogs & Videos](http://mobxjs.github.io/mobx/faq/blogs.html)
* [Boilerplates](http://mobxjs.github.io/mobx/faq/boilerplates.html)
* [Related projects](http://mobxjs.github.io/mobx/faq/related.html)


## What others are saying...

> After using #mobx for lone projects for a few weeks, it feels awesome to introduce it to the team. Time: 1/2, Fun: 2X

> Working with #mobx is basically a continuous loop of me going “this is way too simple, it definitely won’t work” only to be proven wrong

> Try react-mobx with es6 and you will love it so much that you will hug someone.

> I have built big apps with MobX already and comparing to the one before that which was using Redux, it is simpler to read and much easier to reason about.

> The #mobx is the way I always want things to be! It's really surprising simple and fast! Totally awesome! Don't miss it!

## Contributing

* Feel free to send small pull requests. Please discuss new features or big changes in a GitHub issue first.
* Use `npm test` to run the basic test suite, `npm run coverage` for the test suite with coverage and `npm run perf` for the performance tests.

> Note: Before testing, make sure to run `npm run small-build`.

## Flow support
MobX ships with flow typings. To use them in your project, add this to the `[libs]` section of your `.flowconfig`:
```
[libs]
node_modules/mobx/lib/mobx.js.flow
```

## Bower support

Bower support is available through the infamous unpkg.com:
`bower install https://unpkg.com/mobx/bower.zip`

Then use `lib/mobx.umd.js` or `lib/mobx.umd.min.js`

## MobX was formerly known as Mobservable.

See the [changelog](https://github.com/mobxjs/mobx/blob/master/CHANGELOG.md#200) for all the details about `mobservable` to `mobx`.

## Donating

Was MobX key in making your project a success? Share the victory by using the [donate button](https://mobxjs.github.io/mobx/donate.html)!
MobX is developed largely in free time, so any ROI is appreciated :-).
If you leave a name you will be added to the [sponsors](https://github.com/mobxjs/mobx/blob/master/sponsors.md) list :).

### Backers
Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/mobx#backer)]

<a href="https://opencollective.com/mobx/backer/0/website" target="_blank"><img src="https://opencollective.com/mobx/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/1/website" target="_blank"><img src="https://opencollective.com/mobx/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/2/website" target="_blank"><img src="https://opencollective.com/mobx/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/3/website" target="_blank"><img src="https://opencollective.com/mobx/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/4/website" target="_blank"><img src="https://opencollective.com/mobx/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/5/website" target="_blank"><img src="https://opencollective.com/mobx/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/6/website" target="_blank"><img src="https://opencollective.com/mobx/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/7/website" target="_blank"><img src="https://opencollective.com/mobx/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/8/website" target="_blank"><img src="https://opencollective.com/mobx/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/9/website" target="_blank"><img src="https://opencollective.com/mobx/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/10/website" target="_blank"><img src="https://opencollective.com/mobx/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/11/website" target="_blank"><img src="https://opencollective.com/mobx/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/12/website" target="_blank"><img src="https://opencollective.com/mobx/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/13/website" target="_blank"><img src="https://opencollective.com/mobx/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/14/website" target="_blank"><img src="https://opencollective.com/mobx/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/15/website" target="_blank"><img src="https://opencollective.com/mobx/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/16/website" target="_blank"><img src="https://opencollective.com/mobx/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/17/website" target="_blank"><img src="https://opencollective.com/mobx/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/18/website" target="_blank"><img src="https://opencollective.com/mobx/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/19/website" target="_blank"><img src="https://opencollective.com/mobx/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/20/website" target="_blank"><img src="https://opencollective.com/mobx/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/21/website" target="_blank"><img src="https://opencollective.com/mobx/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/22/website" target="_blank"><img src="https://opencollective.com/mobx/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/23/website" target="_blank"><img src="https://opencollective.com/mobx/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/24/website" target="_blank"><img src="https://opencollective.com/mobx/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/25/website" target="_blank"><img src="https://opencollective.com/mobx/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/26/website" target="_blank"><img src="https://opencollective.com/mobx/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/27/website" target="_blank"><img src="https://opencollective.com/mobx/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/28/website" target="_blank"><img src="https://opencollective.com/mobx/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/mobx/backer/29/website" target="_blank"><img src="https://opencollective.com/mobx/backer/29/avatar.svg"></a>

### Sponsors

Become a sponsor and get your logo on our README on Github with a link to your site. [[Become a sponsor](https://opencollective.com/mobx#sponsor)]

<a href="https://opencollective.com/mobx/sponsor/0/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/1/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/2/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/3/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/4/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/5/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/6/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/7/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/8/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/9/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/10/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/11/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/12/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/13/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/14/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/15/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/16/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/17/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/18/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/19/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/20/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/21/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/22/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/23/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/24/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/25/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/26/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/27/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/28/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/mobx/sponsor/29/website" target="_blank"><img src="https://opencollective.com/mobx/sponsor/29/avatar.svg"></a>
