---
title: What does MobX react to?
sidebar_label: Understanding what MobX reacts to
hide_title: true
---

# What does MobX react to?

MobX usually reacts to exactly the things you expect it to.
Which means that in 90% of your use cases mobx "just works".
However, at some point you will encounter a case where it does not do what you expected.
At that point it is invaluable to understand how MobX determines what to react to.

> MobX reacts to any _existing_ **observable** _property_ that is read during the execution of a tracked function.

-   _"reading"_ is dereferencing an object's property, which can be done through "dotting into" it (eg. `user.name`) or using the bracket notation (eg. `user['name']`, `todos[3]`).
-   _"tracked functions"_ are the expression of `computed`, the function of an observer React function component, the `render()` method of an observer React class component, and the functions that are passed as the first param to `autorun`, `reaction` and `when`.
-   _"during"_ means that only those observables that are read while the function is executing are tracked. It doesn't matter whether these values are used directly or indirectly by the tracked function.

In other words, MobX will not react to:

-   Values that are obtained from observables, but outside a tracked function
-   Observables that are read in an asynchronously invoked code block

## MobX tracks property access, not values

To elaborate on the above rules with an example, suppose that you have the following observable instance:

```javascript
class Message {
    constructor(title, author, likes) {
        this.title = title
        this.author = author
        this.likes = likes
        makeAutoObservable(this)
    }

    updateTitle(title) {
        this.title = title
    }
}

let message = new Message("Foo", { name: "Michel" }, ["John", "Sara"])
```

In memory that looks as follows. The green boxes indicate _observable_ properties. Note that the _values_ themselves are not observable!

![MobX reacts to changing references](../assets/observed-refs.png)

What MobX basically does is recording which _arrows_ you use in your function. After that, it will re-run whenever one of these _arrows_ changes; when they start to refer to something else.

## Examples

Let's show that with a bunch of examples (based on the `message` variable defined above):

#### Correct: dereference inside the tracked function

```javascript
autorun(() => {
    console.log(message.title)
})
message.updateTitle("Bar")
```

This will react as expected, the `.title` property was dereferenced by the autorun, and changed afterwards, so this change is detected.

You can verify what MobX will track by calling [`trace()`](../refguide/trace) inside the tracked function. In the case of the above function it outputs the following:

```javascript
import { trace } from "mobx"

const disposer = autorun(() => {
    console.log(message.title)
    trace()
})
// Outputs:
// [mobx.trace] 'Autorun@2' tracing enabled

message.updateTitle("Hello")
// Outputs:
// [mobx.trace] 'Autorun@2' is invalidated due to a change in: 'Message@1.title'
Hello
```

It is also possible to get the internal dependency (or observer) tree by using `getDependencyTree`:

```javascript
import { getDependencyTree } from "mobx"

// prints the dependency tree of the reaction coupled to the disposer
console.log(getDependencyTree(disposer))
// Outputs:
// { name: 'Autorun@2', dependencies: [ { name: 'Message@1.title' } ] }
```

#### Incorrect: changing a non-observable reference

```javascript
autorun(() => {
    console.log(message.title)
})
message = new Message("Bar", { name: "Martijn" }, ["Felicia", "Marcus"])
```

This will **not** react. `message` was changed, but `message` is not an observable, just a variable which _refers to_ an observable, but the variable (reference) itself is not observable.

#### Incorrect: dereference outside a tracked function

```javascript
let title = message.title
autorun(() => {
    console.log(title)
})
message.updateMessage("Bar")
```

This will **not** react. `message.title` was dereferenced outside the `autorun`, and just contains the value of `message.title` at the moment of dereferencing (the string `"Foo"`). `title` is not an observable so `autorun` will never react.

#### Correct: dereference inside the tracked function

```javascript
autorun(() => {
    console.log(message.author.name)
})

runInAction(() => {
    message.author.name = "Sara"
})
runInAction(() => {
    message.author = { name: "John" }
})
```

This reacts to both changes. Both `author` and `author.name` are dotted into, allowing MobX to track these references.

Note that we had to use `runInAction` here to be allowed to make changes outside
of an `action`.

#### Incorrect: store a local reference to an observable object without tracking

```javascript
const author = message.author
autorun(() => {
    console.log(author.name)
})

runInAction(() => {
    message.author.name = "Sara"
})
runInAction(() => {
    message.author = { name: "John" }
})
```

The first change will be picked up, `message.author` and `author` are the same object, and the `.name` property is dereferenced in the autorun.
However the second change is **not** picked up, because the `message.author` relation is not tracked by the `autorun`. Autorun is still using the "old" `author`.

#### Common pitfall: console.log

```javascript
autorun(() => {
    console.log(message)
})

// Won't trigger a re-run
message.updateTitle("Hello world")
```

In the above example, the updated message title won't be printed, because it is not used inside the autorun.
The autorun only depends on `message`, which is not an observable, but a variable. In other words, as far as MobX is concerned, `title` is not used in the `autorun`.

If you use this in a web browser debugging tool, you may be able to find the
updated value of `title` after all, but this is misleading -- autorun run after all has run once when it was first called. This happens because `console.log` is an asynchronous function and the object is only formatted later in time. This means that if you follow the title in the debugging toolbar, you can find the updated value. But the `autorun` does not track any updates.

The way to make this work is to make sure to always pass immutable data or defensive copies to `console.log`. So the following solutions all react to chnages in `message.title`:

```javascript
autorun(() => {
    console.log(message.title) // clearly, the `.title` observable is used
})

autorun(() => {
    console.log(mobx.toJS(message)) // toJS creates a deep clone, and thus will read the message
})

autorun(() => {
    console.log({ ...message }) // creates a shallow clone, also using `.title` in the process
})

autorun(() => {
    console.log(JSON.stringify(message)) // also reads the entire structure
})
```

#### Correct: access array properties in tracked function

```javascript
autorun(() => {
    console.log(message.likes.length)
})
message.likes.push("Jennifer")
```

This will react as expected. `.length` counts towards a property.
Note that this will react to _any_ change in the array.
Arrays are not tracked per index / property (like observable objects and maps) but as a whole.

#### Incorrect: access out-of-bounds indices in tracked function

```javascript
autorun(() => {
    console.log(message.likes[0])
})
message.likes.push("Jennifer")
```

This will react with the above sample data because array indexers count as property access. But **only** if the provided `index < length`.
MobX does not track not-yet-existing array indices.
So always guard your array index based access with a `.length` check.

#### Correct: access array functions in tracked function

```javascript
autorun(() => {
    console.log(message.likes.join(", "))
})
message.likes.push("Jennifer")
```

This will react as expected. All array functions that do not mutate the array are tracked automatically.

---

```javascript
autorun(() => {
    console.log(message.likes.join(", "))
})
message.likes[2] = "Jennifer"
```

This will react as expected. All array index assignments are detected, but only if `index <= length`.

#### Incorrect: "use" an observable but without accessing any of its properties

```javascript
autorun(() => {
    message.likes
})
message.likes.push("Jennifer")
```

This will **not** react. Simply because the `likes` array itself is not being used by the `autorun`, only the reference to the array.
So in contrast, `messages.likes = ["Jennifer"]` would be picked up; that statement does not modify the array, but the `likes` property itself.

#### Correct: using not yet existing map entries

```javascript
const twitterUrls = observable.map({
    John: "twitter.com/johnny"
})

autorun(() => {
    console.log(twitterUrls.get("Sara"))
})

runInAction(() => {
    twitterUrls.set("Sara", "twitter.com/horsejs")
})
```

This **will** react. Observable maps support observing entries that may not exist.
Note that this will initially print `undefined`.
You can check for the existence of an entry first by using `twitterUrls.has("Sara")`.
So in an environment without Proxy support for dynamically keyed collections always use observable maps. If you do have Proxy support you can use observable maps as well,
but you also have the option to use plain objects.

#### MobX does not track asynchronously accessed data

```javascript
function upperCaseAuthorName(author) {
    const baseName = author.name
    return baseName.toUpperCase()
}
autorun(() => {
    console.log(upperCaseAuthorName(message.author))
})

runInAction(() => {
    message.author.name = "Chesterton"
})
```

This will react. Even though `author.name` is not dereferenced by the the function passed to `autorun` itself, MobX will still track the dereferencing that happens in `upperCaseAuthorName`, because it happens _during_ the execution of the autorun.

---

```javascript
autorun(() => {
    setTimeout(() => console.log(message.likes.join(", ")), 10)
})

runInAction(() => {
    message.likes.push("Jennifer")
})
```

This will **not** react because during the execution of the `autorun` no observables were accessed, only during the `setTimeout`, which is an asynchronous function.

Also see [Asynchronous actions](actions.md).

#### Using non-observable object properties

```javascript
autorun(() => {
    console.log(message.author.age)
})

runInAction(() => {
    message.author.age = 10
})
```

This **will** react if you run React in an environment that supports Proxy.
Note that this is only done for objects created with `observable` or `observable.object`. New properties on class instances will not be made observable automatically.

_Environments without Proxy support_

This will **not** react. MobX can only track observable properties, and 'age' has not been defined as observable property above.

However, it is possible to use the `get` and `set` methods as exposed by MobX to work around this:

```javascript
import { get, set } from "mobx"

autorun(() => {
    console.log(get(message.author, "age"))
})
set(message.author, "age", 10)
```

#### [Without Proxy support] Incorrect: using not yet existing observable object properties

```javascript
autorun(() => {
    console.log(message.author.age)
})
extendObservable(message.author, {
    age: 10
})
```

This will **not** react. MobX will not react to observable properties that did not exist when tracking started.
If the two statements are swapped, or if any other observable causes the `autorun` to re-run, the `autorun` will start tracking the `age` as well.

#### [Without Proxy support] Correct: using MobX utilities to read / write to objects

If you are in an environment without proxy support and still want to use observable
objects as a dynamic collection, you can handle them using the MobX `get` and `set`
API.

The following will react as well:

```javascript
import { get, set, observable } from "mobx"

const twitterUrls = observable.object({
    John: "twitter.com/johnny"
})

autorun(() => {
    console.log(get(twitterUrls, "Sara")) // get can track not yet existing properties
})

runInAction(() => {
    set(twitterUrls, { Sara: "twitter.com/horsejs" })
})
```

See the [object manipulation api](../refguide/api.md#direct-observable-manipulation) for more details

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

## TL;DR

> MobX reacts to any _existing_ **observable** _property_ that is read during the execution of a tracked function.
