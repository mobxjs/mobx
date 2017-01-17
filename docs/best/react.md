# What does MobX react to?

MobX usually reacts to exactly the things you expect it to.
Which means that in 90% of your use cases mobx "just works".
However, at some point you will encounter a case where it might not do what you expected.
At that point it is invaluable to understand how MobX determines what to react to.

> MobX reacts to any _existing_ **observable** _property_ that is read during the execution of a tracked function.

* _"reading"_ is dereferencing an object's property, which can be done through "dotting into" it (eg. `user.name`) or using the bracket notation (eg. `user['name']`).
* _"trackable functions"_ are the expression of `computed`, the `render()` method of an observer component, and the functions that are passed as the first param to `when`, `reaction` and `autorun`.
* _"during"_ means that only those observables that are being read while the function is executing are tracked. It doesn't matter whether these values are used directly or indirectly by the tracked function.

In other words, MobX will not react to:
 * Values that are obtained from observables, but outside a tracked function
 * Observables that are read in an asynchronously invoked code block

## MobX tracks property access, not values

To elaborate on the above rules with an example, suppose that you have the following observable data structure (`observable` applies itself recursively by default, so all fields in this example are observable):

```javascript
let message = observable({
    title: "Foo",
    author: {
        name: "Michel"
    },
    likes: [
        "John", "Sara"
    ]
})
```

In memory that looks as follows. The green boxes indicate _observable_ properties. Note that the _values_ themselves are not observable!

![MobX reacts to changing references](../images/observed-refs.png)

Now what MobX basically does is recording which _arrows_ you use in your function. After that, it will re-run whenever one of this _arrows_ changes; when they start to refer to something else.

## Examples

Lets show that with a bunch of examples (based on the `message` variable defined above):

#### Correct: dereference inside the tracked function

```javascript
autorun(() => {
    console.log(message.title)
})
message.title = "Bar"
```

This will react as expected, the `.title` property was dereferenced by the autorun, and changed afterwards, so this change is detected.

You can verify what MobX will track by calling `whyRun()` inside the tracked function. In the case of the above function it will output the following:

```javascript
autorun(() => {
    console.log(message.title)
    whyRun()
})

// Outputs:
WhyRun? reaction 'Autorun@1':
 * Status: [running]
 * This reaction will re-run if any of the following observables changes:
    ObservableObject@1.title
```

#### Incorrect: changing a non-observable reference

```javascript
autorun(() => {
    console.log(message.title)
})
message = observable({ title: "Bar" })
```

This will **not** react. `message` was changed, but `message` is not an observable, just a variable which _refers to_ an observable,
but the variable (reference) itself is not observable.


#### Incorrect: dereference outside a tracked function

```javascript
var title = message.title;
autorun(() => {
    console.log(title)
})
message.title = "Bar"
```

This will **not** react. `message.title` was dereferenced outside the `autorun`, and just contains the value of `message.title` at the  moment of dereferencing (the string `"Foo"`).
`title` is not an observable so `autorun` will never react.

#### Correct: dereference inside the tracked function

```javascript
autorun(() => {
    console.log(message.author.name)
})
message.author.name = "Sara";
message.author = { name: "John" };
```

This will react to both changes. Both `author` and `author.name` are dotted into, allowing MobX to track these references.

#### Incorrect: store a local reference to an observable object without tracking

```javascript
const author = message.author;
autorun(() => {
    console.log(author.name)
})
message.author.name = "Sara";
message.author = { name: "John" };
```

The first change will be picked up, `message.author` and `author` are the same object, and the `.name` property is dereferenced in the autorun.
However the second change will **not** be picked up, the `message.author` relation is not tracked by the `autorun`. Autorun is still using the "old" `author`.

#### Correct: access array properties in tracked function


```javascript
autorun(() => {
    console.log(message.likes.length);
})
message.likes.push("Jennifer");
```

This will react as expected. `.length` counts towards a property.
Note that this will react to *any* change in the array.
Arrays are not tracked per index / property (like observable objects and maps) but as a whole.

#### Incorrect: access out-of-bounds indices in tracked function

```javascript
autorun(() => {
    console.log(message.likes[0]);
})
message.likes.push("Jennifer");
```

This will react with the above sample data, array indexers count as property access. But **only** if the provided `index < length`.
MobX will not track not-yet-existing indices or object properties (except when using maps).
So always guard your array index based access with a `.length` check.

#### Correct: access array functions in tracked function

```javascript
autorun(() => {
    console.log(message.likes.join(", "));
})
message.likes.push("Jennifer");
```

This will react as expected. All array functions that do not mutate the array are tracked automatically.

---

```javascript
autorun(() => {
    console.log(message.likes.join(", "));
})
message.likes[2] = "Jennifer";
```

This will react as expected. All array index assignments are detected, but only if `index <= length`.

#### Incorrect: "use" an observable but without accessing any of its properties

```javascript
autorun(() => {
    message.likes;
})
message.likes.push("Jennifer");
```

This will **not** react. Simply because the `likes` array itself is not being used by the `autorun`, only the reference to the array.
So in contrast, `messages.likes = ["Jennifer"]` would be picked up; that statement does not modify the array, but the `likes` property itself.

#### Incorrect: using non-observable object properties


```javascript
autorun(() => {
    console.log(message.postDate)
})
message.postDate = new Date()
```

This will **not** react. MobX can only track observable properties.

#### Incorrect: using not yet existing observable object properties

```javascript
autorun(() => {
    console.log(message.postDate)
})
extendObservable(message, {
    postDate: new Date()
})
```

This will **not** react. MobX will not react to observable properties that did not exist when tracking started.
If the two statements are swapped, or if any other observable causes the `autorun` to re-run, the `autorun` will start tracking the `postDate` as well.

#### Correct: using not yet existing map entries

```javascript
const twitterUrls = observable(asMap({
    "John": "twitter.com/johnny"
}))

autorun(() => {
    console.log(twitterUrls.get("Sara"))
})
twitterUrls.set("Sara", "twitter.com/horsejs")
```

This **will** react. Observable maps support observing entries that may not exist.
Note that this will initially print `undefined`.
You can check for the existence of an entry first by using `twitterUrls.has("Sara")`.
So for dynamically keyed collections, always use observable maps.


## MobX only tracks synchronously accessed data

```javascript
function upperCaseAuthorName(author) {
    const baseName = author.name;
    return baseName.toUpperCase();
}
autorun(() => {
    console.log(upperCaseAuthorName(message.author))
})
message.author.name = "Chesterton"
```
This will react. Even though `author.name` is not dereferenced by the thunk passed to `autorun` itself,
MobX will still track the dereferencing that happens in `upperCaseAuthorName`,
because it happens _during_ the execution of the autorun.

----

```javascript
autorun(() => {
    setTimeout(
        () => console.log(message.likes.join(", ")),
        10
    )
})
message.likes.push("Jennifer");
```

This will **not** react, during the execution of the `autorun` no observables where accessed, only during the `setTimeout`.
In general this is quite obvious and rarely causes issues.
The notable caveat here is passing renderable callbacks to React components, take for example the following example:

```javascript
const MyComponent = observer(({ message }) =>
    <SomeContainer
        title = {() => <div>{message.title}</div>}
    />
)

message.title = "Bar"
```

At first glance everything might seem ok here, except that the `<div>` is actually not rendered by `MyComponent` (which has a tracked rendering), but by `SomeContainer`.
So to make sure that the title of `SomeContainer` correctly reacts to a new `message.title`, `SomeContainer` should be an `observer` as well.
If `SomeContainer` comes from an external lib, you can also fix this by wrapping the `div` in its own stateless `observer` based component, and instantiating that one in the callback:

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

## Avoid caching observables in local fields

A common mistake is to store local variables that dereference observables, and then expect components to react. For example:

```javascript
@observer class MyComponent extends React.component {
    author;
    constructor(props) {
        super(props)
        this.author = props.message.author;
    }

    render() {
        return <div>{author.name}</div>
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

Suppose that we use the following components are used to render our above `message` object.

```javascript
const Message = observer(({ message }) =>
    <div>
        {message.title}
        <Author author={ message.author } />
        <Likes likes={ message.likes } />
    </div>
)

const Author = observer(({ author }) =>
    <span>{author.name}</span>
)

const Likes = observer(({ likes }) =>
    <ul>
        {likes.map(like =>
            <li>{like}</li>
        )}
    </ul>
)
```

| change | re-rendering component |
| --- | --- |
| `message.title = "Bar"` | `Message` |
| `message.author.name = "Susan"` | `Author` (`.author` is dereferenced in `Message`, but didn't change)* |
| `message.author = { name: "Susan"}` | `Message`, `Author` |
| `message.likes[0] = "Michel"` | `Likes` |

Notes:
1. \* If the `Author` component was invoked like: `<Author author={ message.author.name} />`. Then `Message` would be the dereferencing component and react to changes to `message.author.name`. Nonetheless `<Author>` would rerender as well, because it receives a new value. So performance wise it is best to dereference as late as possible.
2. \** If likes where objects instead of strings, and if they were rendered by their own `Like` component, the `Likes` component would not rerender for changes happening inside a specific like.

## TL;DR

> MobX reacts to any an _existing_ **observable** _property_ that is read during the execution of a tracked function.
