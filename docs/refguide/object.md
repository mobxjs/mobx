---
title: Observable Objects
sidebar_label: objects
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Observable Objects

Usage:

-   `observable.object(props, annotations?, options?)`

If a plain JavaScript object is passed to `observable` all properties inside will be copied into a clone and made observable.
A plain object is an object that wasn't created using a constructor function, but has `Object` as its prototype or no prototype at all.
By default, `observable` is applied recursively. If one of the encountered values is an object or array, that value will be passed through `observable` as well.

The `annotations` parameter can be used to override the declarations used for specific properties, like [`makeObservable` and `makeAutoObservable`](observable.md). Check out the [modifiers](modifiers.md) section as well.

```javascript
import { observable, autorun, action } from "mobx"

var person = observable(
    {
        // Observable properties:
        name: "John",
        age: 42,
        showAge: false,

        // Computed property:
        get labelText() {
            return this.showAge ? `${this.name} (age: ${this.age})` : this.name
        },

        setAge(age) {
            this.age = age
        }
    },
    {
        setAge: action
    }
)

// Object properties don't expose an 'observe' method,
// but don't worry, 'mobx.autorun' is even more powerful.
autorun(() => console.log(person.labelText))

// Prints: 'Dave'.
person.name = "Dave"

// Prints: 'Dave (age: 21)'.
person.setAge(21)
```

Some things to keep in mind when making objects observable:

-   Only plain objects will be made observable. For non-plain objects it is considered the responsibility of the constructor to initialize the observable properties using [`makeObservable` or `makeAutoObservable`](observable.md).
-   Property getters will be automatically turned into derived properties, just like declaring it [`computed`](computed) would do.
-   `observable` is automatically recursively applied to a whole object graph, both on instantiation and to any new values that will be assigned to observable properties in the future. It will not recurse into non-plain objects.
-   These defaults are fine in 95% of the cases, but for more fine-grained control on how and which properties should be made observable, check out the [modifiers](modifiers.md) section.
-   Pass `{ deep: false }` as 3rd argument to disable the automatic conversion of property values.
-   Pass `{ name: "my object" }` to assign a friendly debug name to the object.

## `isObservableObject`

Usage:

-   `isObservableObject(value)`

Returns `true` if `value` is an observable object.

## Limitations in environments without Proxy support

When passing objects through `observable` only the properties that exist at the time of making the object observable will become observable. Properties that are added to the object at a later time won't become observable, unless [`set`](object-api.md) or [`extendObservable`](api.md#extendobservable) is used.

Check out the [limitations without proxies](configure.md#limitations-without-proxy-support) section.
