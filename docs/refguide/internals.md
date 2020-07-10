---
title: Internal functions
sidebar_label: Internal functions [🚀]
hide_title: true
---

# Internal functions [🚀]

The following methods are all used internally by MobX, and might come in handy in rare cases. But usually MobX offers more declarative alternatives to tackle the same problem. They might come in handy though if you try to extend MobX.

## `transaction`

_Transaction is a low-level api, it is recommended to use actions instead_

Usage:

-   `transaction(worker: () => any)`

`transaction` can be used to batch a bunch of updates without notifying any observers until the end of the transaction. Like `untracked`, it is automatically applied by `action`, so usually it makes more sense to use actions than to use `transaction` directly.

`transaction` takes a single, parameterless `worker` function as argument and runs it.
No observers are notified until this function has completed.
`transaction` returns any value that was returned by the `worker` function.
Note that `transaction` runs completely synchronously.
Transactions can be nested. Only after completing the outermost `transaction` pending reactions will be run.

```javascript
import { observable, transaction, autorun } from "mobx"

const numbers = observable([])

autorun(() => console.log(numbers.length, "numbers!"))
// Prints: '0 numbers!'

transaction(() => {
    transaction(() => {
        numbers.push(1)
        numbers.push(2)
    })
    numbers.push(3)
})
// Prints: '3 numbers!'
```

## `untracked`

Untracked allows you to run a piece of code without establishing observers.
Like `transaction`, `untracked` is automatically applied by `action`, so usually it makes more sense to use actions than to use `untracked` directly.
Example:

```javascript
const person = observable({
    firstName: "Michel",
    lastName: "Weststrate"
})

autorun(() => {
    console.log(
        person.lastName,
        ",",
        // this untracked block will return the person's firstName without establishing a dependency
        untracked(() => person.firstName)
    )
})
// prints: Weststrate, Michel

person.firstName = "G.K."
// doesn't print!

person.lastName = "Chesterton"
// prints: Chesterton, G.K.
```

## `createAtom`

Utility function that can be used to create your own observable data structures and hook them up to MobX.
Used internally by all observable data types.

[&laquo;details&raquo;](extending.md)
