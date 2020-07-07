---
title: Always dispose reactions
sidebar_label: Always dispose reactions
hide_title: true
---

# Always dispose reactions

All forms of `autorun`, `reaction`, `when`, `observe` and `intercept` are only garbage collected if all objects they observe are garbage collected themselves.

So we recommend you use the disposer function that is returned from these functions to stop them when you no longer need them. If you don't do this it can lead to performance
degradation due to unnecessary recomputation. You may also end up with duplicate registrations of the same reaction, which again can lead to performance degradation as well as unintended behavior.

Reactions like `autorun`, `reaction` and `when` might observe many different observables, and as long as one of them is still in scope, the reaction remains in scope. This means that all other observables it uses are also kept alive to support future recomputions.

For `observe` and `intercept` it is not strictly necessary to dispose them if they target `this`. `when` disposes itself, unless you cancel it manually.

To avoid these issues, make sure to dispose of reactions when they are no longer
needed.

Example:

```javascript
class Vat {
    value = 1.2

    constructor() {
        makeAutoObservable(this)
    }
}

const vat = new Vat()

class OrderLine {
    price = 10
    amount = 1
    constructor() {
        makeAutoObservable(this)

        // this autorun will be GC-ed together with the current orderline instance
        // as it only uses observables from `this`. It's not strictly necessary
        // to dispose of it once an OrderLine instance is deleted.
        this.disposer1 = autorun(() => {
            doSomethingWith(this.price * this.amount)
        })
        // this autorun won't be GC-ed together with the current orderline instance
        // since vat keeps a reference to notify this autorun, which in turn keeps
        // 'this' in scope
        this.disposer2 = autorun(() => {
            doSomethingWith(this.price * this.amount * vat.value)
        })
    }

    dispose() {
        // So, to avoid subtle memory issues, always call the
        // disposers when the reaction is no longer needed
        this.disposer1()
        this.disposer2()
    }
}
```
