---
sidebar_label: Optimizing React components
title: Optimizing rendering React components
hide_title: true
---

# Optimizing rendering React components

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

MobX is very fast, [often even faster than Redux](https://twitter.com/mweststrate/status/718444275239882753). But here are some tips to get most out of React and MobX. Note that most tips apply to React in general and are not specific for MobX.

## Use many small components

`@observer` components will track all values they use and re-render if any of them changes.
So the smaller your components are, the smaller the change they have to re-render; it means that more parts of your user interface have the possibility to render independently of each other.

## Render lists in dedicated components

This is especially true when rendering big collections.
React is notoriously bad at rendering large collections as the reconciler has to evaluate the components produced by a collection on each collection change.
It is therefore recommended to have components that just map over a collection and render it, and render nothing else:

Bad:

```javascript
@observer
class MyComponent extends Component {
    render() {
        const { todos, user } = this.props
        return (
            <div>
                {user.name}
                <ul>
                    {todos.map(todo => (
                        <TodoView todo={todo} key={todo.id} />
                    ))}
                </ul>
            </div>
        )
    }
}
```

In the above listing React will unnecessarily need to reconcile all TodoView components when the `user.name` changes. They won't re-render, but the reconcile process is expensive in itself.

Good:

```javascript
@observer class MyComponent extends Component {
    render() {
        const {todos, user} = this.props;
        return (<div>
            {user.name}
            <TodosView todos={todos} />
        </div>)
    }
}

@observer class TodosView extends Component {
    render() {
        const {todos} = this.props;
        return <ul>
            {todos.map(todo => <TodoView todo={todo} key={todo.id} />)}
        </ul>)
    }
}
```

## Don't use array indexes as keys

Don't use array indexes or any value that might change in the future as key. Generate ids for your objects if needed.
See also this [blog](https://medium.com/@robinpokorny/index-as-a-key-is-an-anti-pattern-e0349aece318).

## Dereference values late

When using `mobx-react` it is recommended to dereference values as late as possible.
This is because MobX will re-render components that dereference observable values automatically.
If this happens deeper in your component tree, less components have to re-render.

Fast:

`<DisplayName person={person} />`

Slower:

`<DisplayName name={person.name} />`.

There is nothing wrong to the latter, but a change in the `name` property will, in the first case, trigger only the `DisplayName` to re-render, while in the latter, the owner of the component has to re-render. If rendering the owning component is fast enough, that approach will work well.

You may notice that in order to gain the best possible performance, you'd have to create lots of small observer components where each would be customized to render some different part of data, for example:

`const PersonNameDisplayer = observer((props) => <DisplayName name={props.person.name} />)`

`const CarNameDisplayer = observer((props) => <DisplayName name={props.car.model} />)`

`const ManufacturerNameDisplayer = observer((props) => <DisplayName name={props.car.manufacturer.name} />)`

This is a valid option, but may become tedious if you have lots of data of different shape. An alternative is using a function that returns the data that you want your `*Displayer` to render:

`const GenericNameDisplayer = observer((props) => <DisplayName name={props.getNameTracked()} />)`

Then, you may use the component like this:

```javascript
render() {
  const { person, car } = this.props;
  return (
    <>
      <GenericNameDisplayer getNameTracked={() => person.name} />
      <GenericNameDisplayer getNameTracked={car.getModelTracked} />
      <GenericNameDisplayer getNameTracked={this.getManufacturerNameTracked} />
    </>
  );
}

getManufacturerNameTracked = () => this.props.car.manufacturer.name;

...
class Car {
  @observable model
  getModelTracked = () => this.model
}
```

This approach will allow `GenericNameDisplayer` to be reused throughout your application to render any name. Now, what remains to be solved is the placement of those functions: the sample shows three possibilities - you may create the function directly in the render method (which is not considered a good practice), you may place the function in the component (as with `getManufacturerNameTracked`), or you may place the function directly on the object that contains the data (as with `getModelTracked`).

## Bind functions early

This tip applies to React in general and libraries using `PureRenderMixin` especially, try to avoid creating new closures in render methods.

See also these resources:

-   [Autobinding with property initializers](https://facebook.github.io/react/blog/2015/01/27/react-v0.13.0-beta-1.html#autobinding)
-   [ESLint rule for no-bind](https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/jsx-no-bind.md)

Bad:

```javascript
render() {
    return <MyWidget onClick={() => { alert('hi') }} />
}
```

Good:

```javascript
render() {
    return <MyWidget onClick={this.handleClick} />
}

handleClick = () => {
    alert('hi')
}
```

The bad example will always yield the `shouldComponent` of `PureRenderMixin` used in `MyWidget` to always yield false as you pass a new function each time the parent is re-rendered.
