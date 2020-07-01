---
title: makeObservable and makeAutoObservable
sidebar_label: makeObservable and makeAutoObservable
hide_title: true
---

# makeObservable and makeAutoObservable

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

-   `observable`: Used on a property to declare it observable by MobX. A property can be anything that MobX can track: primitive values, arrays, objects and `Map`. The property cannot be a getter or a setter.

-   `computed`: Used on a [getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) to declare it as a derived value from observable state. Should have no side effects and not modify state.

-   `action`: Used on a method that modifies observable properties.

-   `true`: Infer annotation: getters are `computed`, methods are `action`, any property is `observable`. Usually you would use `makeAutoObservable` to infer.

-   `false`: Explicitly do not annotation this property. Normally only useful with `makeAutoObservable`.

`makeAutoObservable` behaves much the same way, but infers all properties by default.
You can still use `annotations` to override this behavior, in particular to use `false` to exclude a property or method from being automatically declared.

Here is the doubler with `makeAutoObservable`:

```javascript
import { makeAutoObservable } from "mobx"

class Doubler {
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
