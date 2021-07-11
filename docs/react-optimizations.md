---
title: Optimizing React component rendering
sidebar_label: React optimizations {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Optimizing React component rendering {🚀}

MobX is very fast, [often even faster than Redux](https://twitter.com/mweststrate/status/718444275239882753), but here are some tips to get most out of React and MobX. Most apply to React in general and are not specific to MobX.
Note that while it's good to be aware of these patterns, usually your application
will be fast enough even if you don't worry about them at all.

Prioritize performance only when it's an actual issue!

## Use many small components

`observer` components will track all values they use and re-render if any of them changes.
So the smaller your components are, the smaller the change they have to re-render. It means that more parts of your user interface have the possibility to render independently of each other.

## Render lists in dedicated components

The above is especially true when rendering big collections.
React is notoriously bad at rendering large collections as the reconciler has to evaluate the components produced by a collection on each collection change.
It is therefore recommended to have components that just map over a collection and render it, and render nothing else.

Bad:

```javascript
const MyComponent = observer(({ todos, user }) => (
    <div>
        {user.name}
        <ul>
            {todos.map(todo => (
                <TodoView todo={todo} key={todo.id} />
            ))}
        </ul>
    </div>
))
```

In the above listing React will unnecessarily need to reconcile all `TodoView` components when the `user.name` changes. They won't re-render, but the reconcile process is expensive in itself.

Good:

```javascript
const MyComponent = observer(({ todos, user }) => (
    <div>
        {user.name}
        <TodosView todos={todos} />
    </div>
))

const TodosView = observer(({ todos }) => (
    <ul>
        {todos.map(todo => (
            <TodoView todo={todo} key={todo.id} />
        ))}
    </ul>
))
```

## Don't use array indexes as keys

Don't use array indexes or any value that might change in the future as key. Generate ids for your objects if needed.
Check out this [blog post](https://medium.com/@robinpokorny/index-as-a-key-is-an-anti-pattern-e0349aece318).

## Dereference values late

When using `mobx-react` it is recommended to dereference values as late as possible.
This is because MobX will re-render components that dereference observable values automatically.
If this happens deeper in your component tree, less components have to re-render.

Slower:

```javascript
<DisplayName name={person.name} />
```

Faster:

```javascript
<DisplayName person={person} />
```

In the faster example, a change in the `name` property triggers only `DisplayName` to re-render, while in the slower one the owner of the component has to re-render as well. There is nothing wrong with that, and if rendering of the owning component is fast enough (usually it is!), then this approach works well.

### Function props {🚀}

You may notice that to dereference values late, you have to create lots of small observer components where each is customized to render a different part of data, for example:

```javascript
const PersonNameDisplayer = observer(({ person }) => <DisplayName name={person.name} />)

const CarNameDisplayer = observer(({ car }) => <DisplayName name={car.model} />)

const ManufacturerNameDisplayer = observer(({ car }) => 
    <DisplayName name={car.manufacturer.name} />
)
```

This quickly becomes tedious if you have lots of data of different shape. An alternative is to use a function that returns the data that you want your `*Displayer` to render:

```javascript
const GenericNameDisplayer = observer(({ getName }) => <DisplayName name={getName()} />)
```

Then, you can use the component like this:

```javascript
const MyComponent = ({ person, car }) => (
    <>
        <GenericNameDisplayer getName={() => person.name} />
        <GenericNameDisplayer getName={() => car.model} />
        <GenericNameDisplayer getName={() => car.manufacturer.name} />
    </>
)
```

This approach will allow `GenericNameDisplayer` to be reused throughout your application to render any name, and you still keep component re-rendering
to a minimum.
