---
title: MobX and React pitfalls
sidebar_label: MobX and React pitfalls
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX and React pitfalls

## MobX only tracks data accessed for `observer` components if they are directly accessed by `render`

A common mistake made with `observer` is that it doesn't track data that syntactically seems parent of the `observer` component,
but in practice is actually rendered out by a different component. This often happens when render callbacks of components are passed in first class to another component.

Take for example the following contrived example:

```javascript
const MyComponent = observer(({ message }) => (
    <SomeContainer title={() => <div>{message.title}</div>} />
))

message.title = "Bar"
```

At first glance everything might seem ok here, except that the `<div>` is actually not rendered by `MyComponent` (which has a tracked rendering), but by `SomeContainer`.
So to make sure that the title of `SomeContainer` correctly reacts to a new `message.title`, `SomeContainer` should be an `observer` as well.

If `SomeContainer` comes from an external lib, this is often not under your own control. In that case you can address this by either wrapping the `div` in its own stateless `observer` based component, or by leveraging the `<Observer>` component:

```javascript
const MyComponent = observer(({ message }) =>
    <SomeContainer
        title = {() => <TitleRenderer message={message} />}
    />
)

const TitleRenderer = observer(({ message }) =>
    <div>{message.title}</div>}
)

message.title = "Bar"
```

Alternatively, to avoid creating additional components, it is also possible to use the mobx-react built-in `Observer` component, which takes no arguments, and a single render function as children:

```javascript
const MyComponent = ({ message }) => (
    <SomeContainer title={() => <Observer>{() => <div>{message.title}</div>}</Observer>} />
)

message.title = "Bar"
```

## Avoid caching observables in local fields

A common mistake is to store local variables that dereference observables, and then expect components to react. For example:

```javascript
@observer
class MyComponent extends React.component {
    author
    constructor(props) {
        super(props)
        this.author = props.message.author
    }

    render() {
        return <div>{this.author.name}</div>
    }
}
```

This component will react to changes in the `author`'s name, but it won't react to changing the `.author` of the `message` itself! Because that dereferencing happened outside `render()`,
which is the only tracked function of an `observer` component.
Note that even marking the `author` component field as `@observable` field does not solve this; that field is still assigned only once.
This can simply be solved by doing the dereferencing inside `render()`, or by introducing a computed property on the component instance:

```javascript
@observer class MyComponent extends React.component {
    @computed get author() {
        return this.props.message.author
    }
// ...
```

## How multiple components will render

Suppose that the following components are used to render our above `message` object.

```javascript
const Message = observer(({ message }) => (
    <div>
        {message.title}
        <Author author={message.author} />
        <Likes likes={message.likes} />
    </div>
))

const Author = observer(({ author }) => <span>{author.name}</span>)

const Likes = observer(({ likes }) => (
    <ul>
        {likes.map(like => (
            <li>{like}</li>
        ))}
    </ul>
))
```

| change                              | re-rendering component                                                 |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `message.title = "Bar"`             | `Message`                                                              |
| `message.author.name = "Susan"`     | `Author` (`.author` is dereferenced in `Message`, but didn't change)\* |
| `message.author = { name: "Susan"}` | `Message`, `Author`                                                    |
| `message.likes[0] = "Michel"`       | `Likes`                                                                |

Notes:

1. \* If the `Author` component was invoked like: `<Author author={ message.author.name} />`. Then `Message` would be the dereferencing component and react to changes to `message.author.name`. Nonetheless `<Author>` would rerender as well, because it receives a new value. So performance wise it is best to dereference as late as possible.
2. \*\* If likes were objects instead of strings, and if they were rendered by their own `Like` component, the `Likes` component would not rerender for changes happening inside a specific like.
