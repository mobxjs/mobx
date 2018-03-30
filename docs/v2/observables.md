# Creating observable data

To enable MobX to react to state changes, state has to be observabe.
MobX api's to turn _object properties_, _array entries_ and _map entries_ into observables.
You might wonder, what about primitives? Primitives in JavaScript are immutable, hence observing them would be pointless
(you can however, [box](TODO) them, but there is rarely a need to do so).

It is key to remember: _MobX doesn't work with observable values, it works with observable properties_.

The benefit of observable data structures in MobX is that you interact with them in the same way as normal JavaScript data structures.
This means that you don't have to learn a new api to read or write to observable data structures.
They can be mutated just like normal data structures.

An additional benefit is that type systems like TypeScript or Flow understand observable data structures very well.

## Objects

Objects can be made observable by passing them through `object.observable`.
This creates a _copy_ of the object passed in, and will turn all it's properties into observable properties.

There is one exception: _getters_ are turned into [computed](TODO) properties.

We used observable objects already in our earlier `stopWatch` example:

```javascript
import { observable } from 'mobx'

const stopWatch = observable.object({
    start: Date.now(),
    now: Date.now(),
    get elapsed() {
        const elapsed = Math.max(0, this.now - this.start)
        return `${Math.floor(elapsed / 1000)}s ${elapsed % 1000}ms.`
    }
})
```

By default, any value that initially or at a later moment in time assigned to an observable property, will be turned into an observable itself as well.
This behavior can be [configured](TODO).

`observable.object` accepts two additional, optional arguments: `decorators` and `options`. These are discussed in the [API docs](TODO).

_Caveat: In MobX 4, properties assigned after the initial creation, will not be made observable automatically. See [caveats](caveats.md)_

## Arrays

Similar to `observable.object`, `observable.array` copies an array into an observable array.
Like observable objects, observable arrays by default their values into observables.

This example show how powerful that is:

```javascript
import { observable, autorun } from 'mobx'

const todos = observable([
    {
        title: 'drink coffe',
        done: true
    },
    {
        title: 'read MobX docs',
        done: false
    }
])

autorun(() => {
    console.log('painting')
    const unfinished = todos.filter(todo => todo.done === false)
    document.body.innerHTML = `<ol>${unfinished.map(todo => `<li>${todo.title}</li>`)}</ol>`
})

todos.push({
    title: 'use MobX in project',
    done: false
}) // causes repaint

todos[0].title = 'drink coffee' // no repaint, this property was not used by the paint!
todos[0].done = false // causes repaint
todos[1] = { title: 'watch egghead.io course about MobX', done: false } // causes repaint
```

Note that not just the array has become observable, the todos inside it have become observable as well, and MobX will track the dependencies of the
HTML in a very fine grained way. You can try this example on [codesandbox.io](https://codesandbox.io/s/5ko2kml8rk).

Observable arrays offer a few convenient API's that standard arrays don't offer, like `replace`, `remove` and `clear`.
For an extensive overview see the [API docs](TODO).

_Caveat: In MobX 4, observable arrays are not real arrays. They are emulated. This means that `Array.isArray` will return `false` on an observable array._
_When pasing observable arrays to external libraries, or before `concat`-ing them, use `.slice()` to convert them back to native arrays._
_See [caveats](caveats.md)_


## Maps

## `.observable`

## Classes

cannot make observable

### @observable

### Decorate

### extendObservable

## Auto conversion of values

infetivve

deep: false

decorators overview

## MobX doesn't convert non-plain objects

## MobX tracks _property_ access

## Caveats