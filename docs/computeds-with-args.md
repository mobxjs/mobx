---
title: Computeds with arguments
sidebar_label: Computeds with arguments {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Computeds with arguments {🚀}

The `computed` annotation can only be used on getters, which don't take arguments.
What about computations that do take arguments?
Take the below example of a React component that renders a specific `Item`,
and the application supports multi-selection.

How can we implement a derivation like `store.isSelected(item.id)`?

```javascript
import * as React from 'react'
import { observer } from 'mobx-react-lite'

const Item = observer(({ item, store }) => (
    <div className={store.isSelected(item.id) ? "selected" : ""}>
        {item.title}
    </div>
))
```

There are four ways in which we can approach this. You can try the solutions below in [this CodeSandbox](https://codesandbox.io/s/multi-selection-odup1?file=/src/index.tsx).

## 1. Derivations don't _need_ to be `computed`

A function doesn't need to be marked as `computed` in order for MobX to track it.
The above example would already work completely fine out of the box.
It is important to realize that computed values are only _caching points_.
If the derivations are pure (and they should be), having a getter or function without `computed` doesn't change the behavior, it is just slightly less efficient.

The above example works fine despite `isSelected` not being a `computed`. The `observer` component will detect and subscribe to any observables that were read by `isSelected` because the function executes as part of rendering that is tracked.

It is good to realize that all `Item` components, in this case, will respond to future selection changes,
as they all subscribe directly to the observables that capture the selection.
This is a worst-case example. In general, it is completely fine to have unmarked functions that derive information, and this is a good default strategy until numbers prove anything else should be done.

## 2. Close over the arguments

This is a more efficient implementation compared to the original.

```javascript
import * as React from 'react'
import { computed } from 'mobx'
import { observer } from 'mobx-react-lite'

const Item = observer(({ item, store }) => {
    const isSelected = computed(() => store.isSelected(item.id)).get()
    return (
        <div className={isSelected ? "selected" : ""}>
            {item.title}
        </div>
    )
})
```

We create a fresh computed value in the middle of a reaction. This works fine and does introduce that additional caching point, avoiding all components having to directly respond to every selection change.
The advantage of this approach is that the component itself will only re-render if the
`isSelected` state toggles, in which case we indeed have to re-render to swap the `className`.

The fact that we create a new `computed` in a next render is fine, this one will now become the caching
point and the previous one will be cleaned up nicely.
This is a great and advanced optimization technique.

## 3. Move the state

In this specific case the selection could also be stored as an `isSelected` observable on the `Item`. The selection in the store could then be expressed as a `computed` rather than an observable: `get selection() { return this.items.filter(item => item.isSelected) }`, and we don't need `isSelected` anymore.

## 4. Use computedFn {🚀}

Finally,
[`computedFn`](https://github.com/mobxjs/mobx-utils#computedfn) from `mobx-utils` can be used in the definition of `todoStore.selected` to automatically memoize `isSelected`.
It creates a function that memoizes the output for every combination of input arguments.

We recommend to not resort to this one too quickly. It is typical for memoization, that you will need to think about how many different arguments the function is going to be called with, before you can reason about the memory consumption.
It does however automatically clean up entries if their results aren't observed by any reaction, so it won't leak memory in normal circumstances.

Again, check out the [linked CodeSandbox](https://codesandbox.io/s/multi-selection-odup1?file=/src/index.tsx) to try this one out.
