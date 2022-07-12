---
title: Subclassing
sidebar_label: Subclassing
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Subclassing

Subclassing is supported with [limitations](#limitations). Most notably you can only **override actions/flows/computeds on prototype** - you cannot override _[field declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#field_declarations)_. Use the `override` annotation for methods/getters overridden in a subclass - see example below. Try to keep things simple and prefer composition over inheritance.

```javascript
import { makeObservable, observable, computed, action, override } from "mobx"

class Parent {
    // Annotated instance fields are NOT overridable
    observable = 0
    arrowAction = () => {}

    // Non-annotated instance fields are overridable
    overridableArrowAction = action(() => {})

    // Annotated prototype methods/getters are overridable
    action() {}
    actionBound() {}
    get computed() {}

    constructor(value) {
        makeObservable(this, {
            observable: observable,
            arrowAction: action
            action: action,
            actionBound: action.bound,
            computed: computed,
        })
    }
}

class Child extends Parent {
    /* --- INHERITED --- */
    // THROWS - TypeError: Cannot redefine property
    // observable = 5
    // arrowAction = () = {}

    // OK - not annotated
    overridableArrowAction = action(() => {})

    // OK - prototype
    action() {}
    actionBound() {}
    get computed() {}

    /* --- NEW --- */
    childObservable = 0;
    childArrowAction = () => {}
    childAction() {}
    childActionBound() {}
    get childComputed() {}

    constructor(value) {
        super()
        makeObservable(this, {
            // inherited
            action: override,
            actionBound: override,
            computed: override,
            // new
            childObservable: observable,
            childArrowAction: action
            childAction: action,
            childActionBound: action.bound,
            childComputed: computed,
        })
    }
}
```

## Limitations

1. Only `action`, `computed`, `flow`, `action.bound` defined **on prototype** can be **overridden** by subclass.
1. Field can't be re-annotated in subclass, except with `override`.
1. `makeAutoObservable` does not support subclassing.
1. Extending builtins (`ObservableMap`, `ObservableArray`, etc) is not supported.
1. You can't provide different options to `makeObservable` in subclass.
1. You can't mix annotations/decorators in single inheritance chain.
1. [All other limitations apply as well](observable-state.html#limitations)

### `TypeError: Cannot redefine property`

If you see this, you're probably trying to **override arrow function** in subclass `x = () => {}`. That's not possible because **all annotated** fields of classes are **non-configurable** ([see limitations](observable-state.md#limitations)). You have two options:

<details><summary>1. Move function to prototype and use `action.bound` annotation instead</summary>

```javascript
class Parent {
    // action = () => {};
    // =>
    action() {}

    constructor() {
        makeObservable(this, {
            action: action.bound
        })
    }
}
class Child {
    action() {}

    constructor() {
        super()
        makeObservable(this, {
            action: override
        })
    }
}
```

</details>
<details><summary>2. Remove `action` annotation and wrap the function in action manually: `x = action(() => {})`</summary>

```javascript
class Parent {
    // action = () => {};
    // =>
    action = action(() => {})

    constructor() {
        makeObservable(this, {}) // <-- annotation removed
    }
}
class Child {
    action = action(() => {})

    constructor() {
        super()
        makeObservable(this, {}) // <-- annotation removed
    }
}
```

</details>
