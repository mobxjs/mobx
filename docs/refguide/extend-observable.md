---
sidebar_label: extendObservable
hide_title: true
---

# extendObservable

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

`extendObservable(target, properties, decorators?, options?)`

ExtendObservable can be used to add observable properties to the existing target objects.
All key / value pairs in the properties map will result in new observable properties on the target initialized to the given value.
Any getters in the properties map will be turned into computed properties.

The `decorators` param can be used to override the decorator that will be used for a specific property, similar to `decorate` and `observable.object`.

Use the `deep: false` option to make the new properties _shallow_. That is, prevent auto conversion of their _values_ to observables.

```javascript
var Person = function(firstName, lastName) {
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

var matthew = new Person("Matthew", "Henry")

// add an observable property to an already observable object
extendObservable(matthew, {
    age: 353
})
```

Note: `observable.object(object)` is actually an alias for `extendObservable({}, object)`.

Note: `decorate` could be used to introduce observable properties to an object, similar to `extendObservable`. The difference is that `extendObservable` is designed to introduce properties directly on the target instance, where `decorate` introduces them on prototypes; you can either pass it a constructor function (class) directly, or an object that will act as prototype for others.

Note: `extendObservable` can not be used to introduce new properties on observable arrays or objects
