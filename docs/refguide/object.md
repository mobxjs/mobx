---
title: Observable Objects
sidebar_label: objects
hide_title: true
---

## Observable Objects

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Usage `observable.object(props, decorators?, options?)`

If a plain JavaScript object is passed to `observable` all properties inside will be copied into a clone and made observable.
(A plain object is an object that wasn't created using a constructor function / but has `Object` as its prototype, or no prototype at all.)
`observable` is by default applied recursively, so if one of the encountered values is an object or array, that value will be passed through `observable` as well.

```javascript
import { observable, autorun, action } from "mobx"

var person = observable(
    {
        // observable properties:
        name: "John",
        age: 42,
        showAge: false,

        // computed property:
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

// object properties don't expose an 'observe' method,
// but don't worry, 'mobx.autorun' is even more powerful
autorun(() => console.log(person.labelText))

person.name = "Dave"
// prints: 'Dave'

person.setAge(21)
// etc
```

Some things to keep in mind when making objects observable:

-   _[MobX 4 and lower]_ When passing objects through `observable`, only the properties that exist at the time of making the object observable will be observable. Properties that are added to the object at a later time won't become observable, unless [`set`](object-api.md) or [`extendObservable`](extend-observable.md) is used. See this [blog post](https://medium.com/@trekinbami/observe-changes-in-dynamically-keyed-objects-with-mobx-and-react-24b4f857bae9) for the different options available to work with dynamically keyed objects in MobX 4
-   Only plain objects will be made observable. For non-plain objects it is considered the responsibility of the constructor to initialize the observable properties. Either use the [`@observable`](observable.md) annotation or the [`extendObservable`](extend-observable.md) function.
-   Property getters will be automatically turned into derived properties, just like [`@computed`](computed-decorator) would do.
-   `observable` is applied recursively to a whole object graph automatically. Both on instantiation and to any new values that will be assigned to observable properties in the future. Observable will not recurse into non-plain objects.
-   These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [decorators](modifiers.md) section.
-   Pass `{ deep: false }` as 3rd argument to disable the auto conversion of property values
-   Pass `{ name: "my object" }` to assign a friendly debug name to this object
