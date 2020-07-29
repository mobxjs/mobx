---
title: Derive information with computed
sidebar_label: Computed
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Derive information with computed

Usage:

-   `computed` (annotation)
-   `computed(options)` (annotation)
-   `computed(fn, options?)`

Computed values are values that can be expressed entirely in terms of already existing state.
Conceptually, they are very similar to formulas in spreadsheets.
Computed values can't be underestimated, they help in reducing the amount of state you have to store and are highly optimized. Use them wherever possible.

Computed values are automatically derived from your state if any value that affects them changes.
MobX can optimize the re-calculation of computed values away in many cases because
this calculation is assumed to be pure.
For example, a computed property won't re-run when read, if no observable data used in the previous computation changed.
Nor will a computed property automatically re-run if is not being observed by some [reaction](autorun.md).
In such cases the computation will be suspended.
This means in practice if a computation isn't shown (for example) somewhere in the UI, no cycles will be spend on it.

To create a `computed` property, you need to use a JavaScript [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) and annotate it with `computed`.

It is important to never confuse `computed` with [`autorun`](autorun.md).
They are both expressions tracked by MobX, but always [prefer](autorun.md#use-reactions-sparingly) `computed` if you want to derive a value that is of further use of your program.

## Example

You can use `makeObservable` to declare a getter as computed (if you use `makeAutoObservable`, `observable` or `extendObservable`, all getters are automatically declared as `computed`):

```javascript
import { makeObservable, observable, computed } from "mobx"

class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        makeObservable(this, {
            price: observable,
            amount: observable,
            total: computed
        })
        this.price = price
    }

    get total() {
        console.log("computing...")
        return this.price * this.amount
    }
}

const order = new OrderLine(0)

const stop = autorun(() => {
    console.log("total: " + order.total)
})
// computing...
// total: 0

console.log(order.total)
// (no re-computing!)
// 0

order.amount = 5
// computing...
// (no autorun)

order.price = 2
// computing...
// total: 10

stop()

order.price = 3
// (neither the computation or autorun will recomputed)
```

The above example nicely demonstrates the benefit of a `computed`, it acts as caching point.
Even though we change the `amount`, and this will trigger the `total` to recompute,
it won't trigger the `autorun`, as `total` will detect it output hasn't been affected, so there is no need to update the `autorun`.
In comparison, if total would not be annotated, the autorun would run it's effect 3 times,
as it will directly depend on `total` and `amount`. [Try it](https://codesandbox.io/s/computed-3cjo9?file=/src/index.tsx).

<details><summary>Note: computed values won't cache if they are _not_ observed</summary>

A thing that often confuses newcomers to MobX is that computed values don't
cache or track changes if they are not actively in use.
For example, if we'd extend the above example with calling `console.log(order.total)` twice, after we called `stop()`, the value would be recomputed twice.

The reason is that it is by default beneficial to forget about computations that are not in use by a reaction, for example because they aren't shown anywhere in the UI at this moment.
This default saves memory and computational resources, but can sometimes be confusing in small experiments.
It can be overridden by setting annotating with the `keepAlive` flag ([try it](https://codesandbox.io/s/computed-3cjo9?file=/src/index.tsx)) or by creating a no-op `autorun(() => { someObject.someComputed })`.
Note that both solutions have the risk of creating memory leaks; changing the default behavior here is an anti-pattern.

</details>

<details><summary>Tip: computed values can also have setters</summary>

It is possible to define a [setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) for computed values as well. Note that these setters cannot be used to alter the value of the computed property directly,
but they can be used as 'inverse' of the derivation. Setters are automatically marked as actions. For example:

```javascript
class Dimension {
    length = 2

    constructor() {
        makeAutoObservable(this)
    }

    get squared() {
        return this.length * this.length
    }
    set squared(value) {
        this.length = Math.sqrt(value)
    }
}
```

</details>

## About derivations with arguments

The `computed` annotation can only be used on getters, which don't take arguments.
What about computations that do take arguments?
Take the below example of a React component that renders a specific todo,
and the application supports multi-selection.
How can we implement a derivation like `todoStore.isSelected(todoId)`?

Base example (based on React):

```javascript
import * as React from 'react'
import {observer} from 'mobx-react-lite'

const Todo = observer(({ todo, todoStore }) => (
    <div className={todoStore.isSelected(todo.id) ? "selected" : ""}>
        {todo.title}
    </div>
)
```

### 1. Derivations don't _need_ computed

A function doesn't need to be marked `computed` to enable to MobX to track it.
The above example would already work completely fine out of the box.
It is important to realise that computed values are only _caching points_.
If they are pure (and they shouldn't), having a getter or function without `computed` doesn't change behavior; it is just slightly less inefficient.
The above example works fine despite `isSelected` not being a `computed`;
the `observer` component will detect and subscribe to any observables that were read by `isSelected`, because the function executes as part of the rendering that is tracked.

It is good to realize that all `Todo` components in this case will respond to future selection changes,
as they all subscribe directly to the observables that capture the selection.
This is a worst case example, in general it is completely fine to have unmarked functions that derive information, and this is a good default strategy, until numbers proof anything else should be done.

### 2. Close over the arguments

Here is a more efficient implementation:

```javascript
import * as React from 'react'
import {observer, computed} from 'mobx-react-lite'

const Todo = observer(({ todo, todoStore }) => (
    const isSelected = computed(() => todoStore.isSelected(todo.id))
    <div className={isSelected ? "selected" : ""}>
        {todo.title}
    </div>
)
```

Here we create a fresh computed value in the middle of a reaction.
That works fine and does introduce that additional caching point, avoiding all components to directly
to all selection changes.
The advantage of this approach is that the component itself will only render if the
`isSelected` state toggles (in which we case indeed have to render to swap the `className`).
The fact that we create a new `computed` in a next render is fine, that one will now become the caching
point and the previous one will be cleaned up nicely.
This is a great, advanced optimization technique.

### 3. 🚀 Use computedFn

Finally,
[`computedFn`](https://github.com/mobxjs/mobx-utils#computedfn) from `mobx-utils` can be used in the definition of `todoStore.selected` to automatically memoize `isSelected`.
It creates a function that memoize for each combination of input arguments.
We recommend to not resort to that one too quickly, as, typical for memoization, before you can reason about the memory consumption you will need to think about how many different arguments the function is going to be called with.
It does however automatically clean up entries if their results aren't observed by any reaction, so it won't leak memory in normal circumstances.

## More about computed

[🚀] You can pass [options into `computed`](computed-options.md). If you experience
unexpected behavior, you can also read more about the [detailed behavior of `computed`](computed-behavior.md).

-   unobserved, computeds won't cache

-   don't create new observables in computed, dont cause side effects

Note that `computed` properties are not [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties). Nor can they be overwritten in an inheritance chain.

Derivation graph plaatje
