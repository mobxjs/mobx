# mobservable

<img src="https://mweststrate.github.io/mobservable/images/mobservable.png" align="right" width="120px" />


##### _Unobtrusive reactive library that keeps views automatically in sync with data._

[![Build Status](https://travis-ci.org/mweststrate/mobservable.svg?branch=master)](https://travis-ci.org/mweststrate/mobservable)
[![Coverage Status](https://coveralls.io/repos/mweststrate/mobservable/badge.svg?branch=master&service=github)](https://coveralls.io/github/mweststrate/mobservable?branch=master)
[![mobservable channel on slack](https://img.shields.io/badge/slack-mobservable-blue.svg)](https://reactiflux.slack.com/messages/mobservable/)

[API documentation](https://github.com/mweststrate/mobservable/blob/master/docs/api.md) - [Typings](https://github.com/mweststrate/mobservable/blob/master/dist/mobservable.d.ts)

## Philosophy

Mobservable is light-weight standalone library to create reactive primitives, functions, arrays and objects.
The goal of mobservable is simple:

1. Write simple views. Views should be subscription free.
2. Write simple controllers and stores. Change data without thinking about how this should be reflected in views.
3. Allow flexible model design, be able to use objects, arrays, classes, real references, and cyclic data structures in your app.
4. Performance: find the absolute minimum amount of changes that are needed to update views.
5. Views should be updated atomically and sychronously without showing stale or intermediate values.

Mobservable is born as part of an enterprise scale visual editor,
which needs high performance rendering and covers over 400 different domain concepts.
So the best performance and the simplest possible controller and view code are both of the utmost importance.
See [this blog](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) for more details about that journey.
Mobservable applies reactive programming behind the scenes and is inspired by MVVM frameworks like knockout and ember, yet less obtrusive to use.

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

The first function is `makeReactive`. It is the swiss knife of mobservable and  turns any data structure and function into its reactive counterpart. Objects, arrays, functions; they can all be made reactive. Reactiveness is infectious; new data that is put in reactive data will become reactive as well. To make our timer reactive, just change the first three lines of the code:

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

Thats all folks! Its as simple as that. The `Timer` will now automatically update each time `timerData.secondsPassed` is altered. 
The actual interesting thing about these changes are the things that are *not* in the code:

* The `setInterval` method didn't alter. It still threads `timerData` as a plain JS object.
* There is no state. Timer is still a dump component.
* There is no magic context being passed through components.
* There are no subscriptions of any kind that need to be managed.
* There is no higher order component that needs configuration; no scopes, lenses or cursors.
* There is no forced UI update in our 'controller'.
* If the `Timer` component would be somewhere deep in our app; only the `Timer` would be re-rendered. Nothing else.

All this missing code... it will scale well into large code-bases!
It does not only work for plain objects, but also for arrays, functions, classes, deeply nested structures. 

<div align="center">
    <img src="https://mweststrate.github.io/mobservable/images/overview.png" height="300"/>
</div>

## A Todo application

The following simple todo application can be found up & running on https://mweststrate.github.io/mobservable. A full TodoMVC implementation can be found [here](https://github.com/mweststrate/todomvc/tree/master/examples/react-mobservable)
Note how the array, function and primitive of `todoStore` will all become reactive. There are just three calls to `mobservable` and all the components are kept in sync with the `todoStore`.

```javascript
var todoStore = mobservable.makeReactive({
    todos: [
        {
            title: 'Find a clean mug',
            completed: true
        },
        {
            title: 'Make coffee',
            completed: false
        }
    ],
    completedCount: function() {
        return this.todos.filter((todo) => todo.completed).length;
    },
    pending: 0
});

todoStore.addTodo = function(title) {
    this.todos.push({
        title: title,
        completed: false
    });
};

todoStore.removeTodo = function(todo) {
    this.todos.splice(this.todos.indexOf(todo), 1);
};

todoStore.loadTodosAsync = function() {
    this.pending++;
    setTimeout(function() {
        this.addTodo('Asynchronously created todo');
        this.pending--;
    }.bind(this), 2000);
};

var TodoList = mobservable.reactiveComponent(React.createClass({
    render: function() {
        var store = this.props.store;
        return (<div>
            <ul>
                { store.todos.map((todo, idx) =>
                    (<TodoView store={ store } todo={ todo } key={ idx } />)
                ) }
                { store.pending ? (<li>Loading more items...</li>) : null }
            </ul>
            <hr/>
            Completed { store.completedCount } of { store.todos.length } items.<br/>
            <button onClick={ this.onNewTodo }>New Todo</button>
            <button onClick={ this.loadMore }>Load more...</button>
        </div>);
    },

    onNewTodo: function() {
        this.props.store.addTodo(prompt('Enter a new todo:', 'Try mobservable at home!'));
    },

    loadMore: function() {
        this.props.store.loadTodosAsync();
    }
}));

var TodoView = mobservable.reactiveComponent(React.createClass({
    render: function() {
        var todo = this.props.todo;
        return (<li>
            <input type='checkbox' checked={ todo.completed } onChange={ this.onToggleCompleted } />
            {todo.title}{' '}
            <a href='#' onClick={ this.onEdit }>[edit]</a>
            <a href='#' onClick={ this.onRemove }>[remove]</a>
        </li>);
    },

    onToggleCompleted: function() {
        this.props.todo.completed = !this.props.todo.completed;
    },

    onEdit: function(e) {
        e.preventDefault();
        this.props.todo.title = prompt('Todo:', this.props.todo.title);
    },

    onRemove: function(e) {
        e.preventDefault();
        this.props.store.removeTodo(this.props.todo);
    }
}));

React.render(<TodoList store={todoStore} />, document.getElementById('approot'));
```

## Getting started

Either:
* `npm install mobservable --save` 
* clone the boilerplate repository containing the above example from: https://github.com/mweststrate/react-mobservable-boilerplate
* or fork this [JSFiddle](https://jsfiddle.net/mweststrate/wgbe4guu/)

## Examples

* A simple webshop using [React + mobservable](https://jsfiddle.net/mweststrate/46vL0phw) or [JQuery + mobservable](http://jsfiddle.net/mweststrate/vxn7qgdw).
* [Simple timer](https://jsfiddle.net/mweststrate/wgbe4guu/)
* [TodoMVC](https://rawgit.com/mweststrate/todomvc/immutable-to-observable/examples/react-mobservable/index.html#/), based on the ReactJS TodoMVC.

## Read more

* [Making React reactive: the pursuit of high performing, easily maintainable React apps](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)
* [Pure rendering in the light of time and state](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)
* [Official homepage](http://mweststrate.github.io/mobservable/)
* Advanced [tips & tricks](https://github.com/mweststrate/mobservable/blob/master/docs/tips.md)

## Runtime behavior

* Reactive views always update synchronously (unless `transaction is used`)
* Reactive views always update atomically, intermediate values will never be visible.
* Reactive functions evaluate lazily and are not processed if they aren't observed.
* Dependency detection is based on actual values to real-time minify the amount of dependencies.
* Cycles are detected automatically. 
* Exceptions during computations are propagated to consumers.

## FAQ

**Is mobservable a framework?**

Mobservabe is *not* a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.

**Can I combine flux with mobservable?**

Flux implementations that do not work on the assumption that the data in their stores is immutable should work well with mobservable.
However, the need for flux is less when using mobservable. 
Mobservable already optimizes rendering and since it works with most kinds of data, including cycles and classes.
So other programming paradigms like classic MVC are now can be easily applied in applications that combine ReactJS with mobservable.

**Can I use mobservable together with framework X?**

Probably. 
Mobservable is framework agnostic and can be applied in any JS environment.
It just ships with a small function to transform Reactjs components into reactive view functions for convenience.
Mobservable works just as well server side, and is already combined with JQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b). 