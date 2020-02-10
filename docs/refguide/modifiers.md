---
title: Modifiers
sidebar_label: modifiers
hide_title: true
---

# Modifiers

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

In MobX there is a set of decorators that defines how observable properties will behave.

-   `observable`: An alias for `observable.deep`.
-   `observable.deep`: This is the default modifier, used by any observable. It clones and converts any (not yet observable) array, Map or plain object into it's observable counterpart upon assignment to the given property
-   `observable.ref`: Disables automatic observable conversion, just creates an observable reference instead.
-   `observable.shallow`: Can only used in combination with collections. Turns any assigned collection into an observable, but the values of that collection will be treated as-is.
-   `observable.struct`: Like `ref`, but will ignore new values that are structurally equal to the current value
-   `computed`: Creates a derived property, see [`computed`](computed-decorator.md)
-   `computed(options)`: Idem, sets additional options.
-   `computed.struct`: Same as `computed`, but will only notify any of it's observers when the value produced by the view is _structurally_ different from the previous value
-   `action`: Creates an action, see [`action`](action.md)
-   `action(name)`: Creates an action, overrides the name
-   `action.bound`: Creates an action, and binds `this` to the instance

Decorators can be used with the api's `decorate`, `observable.object`, `extendObservable` and `observable` (when creating objects) to specify how object members should behave.
If no decorators are passed in, the default behavior is to use `observable.deep` for any key / value pair, and `computed` for getters.

```javascript
import { observable, autorun, action } from "mobx"

var person = observable(
    {
        name: "John",
        age: 42,
        showAge: false,

        get labelText() {
            return this.showAge ? `${this.name} (age: ${this.age})` : this.name
        },

        // action:
        setAge(age) {
            this.age = age
        }
    },
    {
        setAge: action
        // the other properties will default to observables  / computed
    }
)
```

```javascript
class Person {
    name = "John"
    age = 42
    showAge = false

    get labelText() {
        return this.showAge ? `${this.name} (age: ${this.age})` : this.name
    }

    setAge(age) {
        this.age = age
    }
}
// when using decorate, all fields should be specified (a class might have many more non-observable internal fields after all)
decorate(Person, {
    name: observable,
    age: observable,
    showAge: observable,
    labelText: computed,
    setAge: action
})
```

## Deep observability

When MobX creates an observable object, (using `observable`, `observable.object`, or `extendObservable`), it introduces observable properties which
by default use the `deep` modifier. The deep modifier basically recursively calls `observable(newValue)` for any newly assigned value.
Which in turns uses the `deep` modifier... you get the idea.

This is a very convenient default. Without any additional effort all values assigned to an observable will themselves be made observable too (unless they already are), so no additional
effort is required to make objects deep observable.

## Reference observability

In some cases however, objects don't need to be converted into observables.
Typical cases are immutable objects, or objects that are not managed by you but by an external library.
Examples are JSX elements, DOM elements, native objects like History, window or etc.
To those kind of objects, you just want to store a reference without turning them into an observable.

For these situations there is the `ref` modifier. It makes sure that an observable property is created, which only tracks the reference but doesn't try to convert its value.
For example:

```javascript
class Message {
    @observable message = "Hello world"

    // fictional example, if author is immutable, we just need to store a reference and shouldn't turn it into a mutable, observable object
    @observable.ref author = null
}
```

Or with just ES5 syntax:

```javascript
function Message() {
    extendObservable(
        this,
        {
            message: "Hello world",
            author: null
        },
        {
            author: observable.ref
        }
    )
}
```

Note that an observable, boxed reference can be created by using `const box = observable.shallowBox(value)`

## Shallow observability

The `observable.shallow` modifier applies observability 'one-level-deep'. You need those if you want to create a _collection_ of observable references.
If a new collection is assigned to a property with this modifier, it will be made observable, but its values will be left as is, so unlike `deep`, it won't recurse.
Example:

```javascript
class AuthorStore {
    @observable.shallow authors = []
}
```

In the above example an assignment of a plain array with authors to the `authors` will update the authors with an observable array, containing the original, non-observable authors.

Note that `{ deep: false }` can be passed as option to `observable`, `observable.object`, `observable.array`, `observable.map` and `extendObservable` to create shallow collections.
