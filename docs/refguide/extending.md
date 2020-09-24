---
sidebar_label: Custom observables 🚀
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Creating custom observables [🚀]

## Atoms

At some point you might want to have more data structures or other things (like streams) that can be used in reactive computations.
Achieving this is pretty simple by using the concept of atoms.
Atoms can be used to signal MobX that some observable data source has been observed or changed, and MobX will signal the atom whenever it is used or no longer in use.

_**Tip**: in many cases you can avoid the need to create your own atoms just by creating a normal observable, and using
the [`onBecomeObserved`](on-become-observed.md) utility to be notified when MobX starts tracking an observable._

The following example demonstrates how you can create an observable `Clock` that returns the current date-time, which can be used in reactive functions.
This clock will only actually tick if it is being observed by someone.

The complete API of the `Atom` class is demonstrated by this example.

```javascript
import { createAtom, autorun } from "mobx"

class Clock {
    atom
    intervalHandler = null
    currentDateTime

    constructor() {
        // Creates an atom to interact with the MobX core algorithm.
        this.atom = createAtom(
            // 1st parameter:
            // - Atom's name, for debugging purposes.
            "Clock",
            // 2nd (optional) parameter:
            // - Callback for when this atom transitions from unobserved to observed.
            () => this.startTicking(),
            // 3rd (optional) parameter:
            // - Callback for when this atom transitions from observed to unobserved.
            () => this.stopTicking()
            // The same atom transitions between these two states multiple times.
        )
    }

    getTime() {
        // Let MobX know this observable data source has been used.
        //
        // reportObserved will return true if the atom is currently being observed
        // by some reaction. If needed, it will also trigger the startTicking
        // onBecomeObserved event handler.
        if (this.atom.reportObserved()) {
            return this.currentDateTime
        } else {
            // getTime was called, but not while a reaction was running, hence
            // nobody depends on this value, and the startTicking onBecomeObserved
            // handler won't be fired.
            //
            // Depending on the nature of your atom it might behave differently
            // in such circumstances, like throwing an error, returning a default
            // value, etc.
            return new Date()
        }
    }

    tick() {
        this.currentDateTime = new Date()
        // Let MobX know that this data source has changed.
        this.atom.reportChanged()
    }

    startTicking() {
        this.tick() // Initial tick.
        this.intervalHandler = setInterval(() => this.tick(), 1000)
    }

    stopTicking() {
        clearInterval(this.intervalHandler)
        this.intervalHandler = null
    }
}

const clock = new Clock()

const disposer = autorun(() => console.log(clock.getTime()))

// ... prints the time every second.

disposer()

// Printing stops. If nobody else uses the same `clock`, it will stop ticking as well.
```
