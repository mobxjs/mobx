---
title: Observable modifiers
sidebar_label: Observable modifiers [🚀]
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Observable modifiers [🚀]

You can use annotations to specify how observable properties behave when you use `makeObservable`, `makeAutoObservable`, `extendObservable` and `observable.object`.

### Deep observability

When MobX creates an observable object, it introduces observable properties which by default use the `deep` modifier. The deep modifier basically recursively calls `observable(newValue)` for any newly assigned value, so
all nested values become observable.

This is a very convenient default. Without any additional effort all values assigned to an observable will themselves be made observable too (unless they already are), so no additional effort is required to make objects deeply observable.

### Reference observability

In some cases however, objects don't need to be converted into observables.
Typical cases are immutable objects, or objects that are not managed by you but by an external library. The examples are JSX elements, DOM elements, native objects like History, window or etc. You just want to store a reference to those kinds of objects without turning them into an observable.

For these situations there is the `ref` modifier. It makes sure that an observable property is created which tracks only the reference but doesn't try to convert its value.

For example:

```javascript
class Message {
    message = "Hello world"
    // Fictional example: if author is immutable, we just need to store a
    // reference and shouldn't turn it into a mutable, observable object.
    author = null

    constructor() {
        makeObservable(this, { message: observable, author: observable.ref })
    }
}
```

**Note:** an observable, boxed reference can be created using `const box = observable.shallowBox(value)` ([more](api.md#observablebox)).

### Shallow observability

The `observable.shallow` modifier applies observability 'one-level-deep'. This is useful if you want to create a _collection_ of observable references.
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

In the example above, an assignment of a plain array with authors to the `authors` observable array, will update it with the original, non-observable authors.

**Note:** `{ deep: false }` can be passed as option to `observable`, `observable.object`, `observable.array`, `observable.map` and `extendObservable` to create shallow collections.

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

        // Action
        setAge(age) {
            this.age = age
        }
    },
    {
        setAge: action
        // Other properties will default to observables or computeds.
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
