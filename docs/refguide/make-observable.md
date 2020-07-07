---
title: makeObservable / makeAutoObservable
sidebar_label: makeObservable / makeAutoObservable
hide_title: true
---

# makeObservable / makeAutoObservable

Usage:

-   `makeObservable(target, annotations?, options?)`
-   `makeAutoObservable(arget, excludes?, options?)`

In `makeObservable`, a JavaScript object (including class instance) is passed into `target`. In `annotations` you can declare properties observable, getters as computed and methods as actions.

Typically `makeObservable` is used in the constructor of a class, and
its first argument is `this`. The `annotations` argument is a mapping with
declarations about properties and methods:

```javascript
import { makeObservable, observable, computed, action } from "mobx"

class Doubler {
    constructor(value) {
        makeObservable(this, {
            value: observable,
            double: computed,
            increment: action
        })
        this.value = value
    }

    get double() {
        return this.value * 2
    }

    increment() {
        this.value++
    }
}
```

Annotation keys are the names of properties and methods.

Possible annotation values are:

-   `observable`: Used on a property to declare it observable by MobX. A property can be anything that MobX can track: primitive values, arrays, objects and [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map). The property cannot be a getter or a setter. See also the rules of [`observable`](observable.md).

-   `action`: Used on a method that modifies observable properties. See also [action](action.md).

-   `action.bound`: Like action, but used to bind the method. See [action.bound](action.md#actionbound).

-   `computed`: Used on a [getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) to declare it as a derived value from observable state. Should have no side effects and not modify state.

*   `true`: Infer annotation: getters are `computed`, methods are `action`, any property is `observable`. Usually you would use `makeAutoObservable` to infer.

*   `false`: Explicitly do not annotate this property. Normally only useful with `makeAutoObservable`.

## `makeAutoObservable`

`makeAutoObservable` behaves much like `makeObservable`, but infers all properties by default. You can still use `annotations` to override this behavior, in particular to use `false` to exclude a property or method from being automatically declared.

Here is the doubler with `makeAutoObservable`:

```javascript
import { makeAutoObservable } from "mobx"

class Doubler {
    value

    constructor(value) {
        makeAutoObservable(this)
        this.value = value
    }

    get double() {
        return this.value * 2
    }

    increment() {
        this.value++
    }
}
```

As you can see this is more compact.

### Excluding properties that are not observable

Here is how you can exclude a property from being observable:

```javascript
import { makeAutoObservable } from "mobx"

class Todo {
    id = Math.random()
    title = ""
    finished = false

    constructor() {
        makeAutoObservable(this, { id: false })
    }

    toggle() {
        this.finished = !finished
    }
}
```

`id` is not intended to be observable as it does not change after construction.
We have therefore declared it as `false` in the `exclusions` argument of
`makeAutoObservable`.

### Excluding methods that are not actions

By default, `makeAutoObservable` considers all methods to be actions. It's common for classes to have methods that are not actions, however, but compute derived information that cannot be getters as they take arguments.

```javascript
class Zoo {
    constructor() {
        this.makeAutoObservable(this, { filterByAnimalClass: false })
    }

    // this is an action
    addAnimal(animal) {
        // ...
    }

    // this is not an action
    filterByAnimalClass(animalClass) {
        // ...
    }
}
```

In this case, the method `filterByAnimalClass` cannot be identified as `computed` as it is not a getter. By default, `makeAutoObservable` would interpret it as an action. We therefore have to exclude it from consideration.

### Bound actions

If you want to automatically bind the action so you can use it as a callback, you can override the behavior of `makeAutoObservable` using [`action.bound`](action.md#actionbound). Alternatively you can define the methods as [arrow function](action.md#bound-arrow-functions).
