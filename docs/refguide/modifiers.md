---
title: Observable modifiers
sidebar_label: Observable modifiers [🚀]
hide_title: true
---

# Observable modifiers [🚀]

When you use `makeObservable`, `makeAutoObservable`, `extendObservable` and `observable.object` you can use annotations to specify how observable properties behave:

-   `observable`: An alias for `observable.deep`. The default.
-   `observable.deep`: This is the default modifier, used by any observable. It clones and converts any (not yet observable) array, Map or plain object into its observable counterpart upon assignment to the given property
-   `observable.ref`: Disables automatic observable conversion, just creates an observable reference instead.
-   `observable.struct`: Like `ref`, but will ignore new values that are structurally equal to the current value.
-   `observable.shallow`: Can only used in combination with collections. Turns any assigned collection into an observable, but the values of that collection will be treated as-is and are not observable themselves.

### Deep observability

When MobX creates an observable object, it introduces observable properties which by default use the `deep` modifier. The deep modifier basically recursively calls `observable(newValue)` for any newly assigned value, so
all nested values become observable.

This is a very convenient default. Without any additional effort all values assigned to an observable will themselves be made observable too (unless they already are), so no additional effort is required to make objects deep observable.

### Reference observability

In some cases however, objects don't need to be converted into observables.
Typical cases are immutable objects, or objects that are not managed by you but by an external library. Examples are JSX elements, DOM elements, native objects like History, window or etc. You just want to store a reference to those kinds of objects without turning them into an observable.

For these situations there is the `ref` modifier. It makes sure that an observable property is created which only tracks the reference but doesn't try to convert its value.

For example:

```javascript
class Message {
    message = "Hello world"
    // fictional example, if author is immutable, we just need to store a
    // reference and shouldn't turn it into a mutable, observable object
    author = null

    constructor() {
        makeObservable(this, { message: observable, author: observable.ref })
    }
}
```

Note that an observable, boxed reference can be created by using `const box = observable.shallowBox(value)` ([more](boxed.md)).

### Shallow observability

The `observable.shallow` modifier applies observability 'one-level-deep'. You need those if you want to create a _collection_ of observable references.
If a new collection is assigned to a property with this modifier, it is made observable, but its values will be left as is, so unlike `deep`, it won't recurse.

Example:

```javascript
class AuthorStore {
    authors = []
    constructor() {
        makeObservable(this, { authors: observable.shallow })
    }
}
```

In the above example an assignment of a plain array with authors to the `authors` will update the authors with an observable array, containing the original, non-observable authors.

Note that `{ deep: false }` can be passed as option to `observable`, `observable.object`, `observable.array`, `observable.map` and `extendObservable` to create shallow collections.

## Examples

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

    constructor() {
        makeObservable(this, {
            name: observable,
            age: observable,
            showAge: observable,
            labelText: computed,
            setAge: action
        })
    }

    get labelText() {
        return this.showAge ? `${this.name} (age: ${this.age})` : this.name
    }

    setAge(age) {
        this.age = age
    }
}
```
