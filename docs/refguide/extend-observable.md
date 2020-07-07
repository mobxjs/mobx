---
sidebar_label: extendObservable
hide_title: true
---

# extendObservable

Usage:

-   `extendObservable(target, properties, annotions?, options?)`

ExtendObservable can be used to add observable properties to an existing target object.
All key / value pairs in the `properties` object result in new observable properties on the target initialized to the given value. Any getters in the properties map are turned into computed properties.

The `annotations` param can be used to override the declaration that is used for a specific property, like [`makeObservable` and `makeAutoObservable`](make-observable.md). The difference between `extendObservable` and `makeAutoObservable` is that `extendObservable` sets properties and declares information about them at the same time.

Use the `deep: false` option to make the new properties _shallow_. That is, prevent auto conversion of their _values_ to observables.

Here we add a new observable property to an alread observable instance:

```javascript
class Person {
    firstName
    lastName

    constructor(firstName, lastName) {
        this.firstName = firstName
        this.lastName = lastName
        makeAutoObservable(this)
    }
}

const matthew = new Person("Matthew", "Henry")

// add a new observable property to an already observable object
extendObservable(matthew, {
    age: 353
})
```

Here is an example of how you could make factory function that constructs
observable instances, though normally you would use a class with `makeObservable` or `makeAutoObservable` for this purpose:

```javascript
class Person = function (firstName, lastName) {
    // initialize observable properties on a new instance
    extendObservable(
        this,
        {
            firstName: firstName,
            lastName: lastName,
            get fullName() {
                return this.firstName + "  " + this.lastName
            },
            setFirstName(firstName) {
                this.firstName = firstName
            }
        },
        {
            setFirstName: action
        }
    )
}
```

Note: `observable.object(object)` is actually an alias for `extendObservable({}, object)`.

Note: `extendObservable` can not be used to introduce new properties on observable arrays or objects
