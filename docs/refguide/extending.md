---
sidebar_label: Custom observables 🚀
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Creating custom observables [🚀]

## Atoms

At some point you might want to have more data structures or other things (like streams) that can be used in reactive computations.
Achieving that is pretty simple by using the concept of atoms.
Atoms can be used to signal MobX that some observable data source has been observed or changed.
And MobX will signal the atom whenever it is used or no longer in use.

_Tip: in many cases you can avoid the need to create your own atoms, by just creating a normal observable, and use
the [`onBecomeObserved`](on-become-observed.md) utility to be notified when MobX starts tracking an observable_

The following example demonstrates how you can create an observable `Clock`, which can be used in reactive functions,
and returns the current date-time.
This clock will only actually tick if it is observed by someone.

The complete API of the `Atom` class is demonstrated by this example.

```javascript
import { createAtom, autorun } from "mobx"

class Clock {
    atom
    intervalHandler = null
    currentDateTime

    constructor() {
        // creates an atom to interact with the MobX core algorithm
        this.atom = createAtom(
            // first param: a name for this atom, for debugging purposes
            "Clock",
            // second (optional) parameter: callback for when this atom transitions from unobserved to observed.
            () => this.startTicking(),
            // third (optional) parameter: callback for when this atom transitions from observed to unobserved
            // note that the same atom transitions multiple times between these two states
            () => this.stopTicking()
        )
    }

    getTime() {
        // let MobX know this observable data source has been used
        // reportObserved will return true if the atom is currently being observed
        // by some reaction.
        // reportObserved will also trigger the onBecomeObserved event handler (startTicking) if needed
        if (this.atom.reportObserved()) {
            return this.currentDateTime
        } else {
            // apparently getTime was called but not while a reaction is running.
            // So, nobody depends on this value, hence the onBecomeObserved handler (startTicking) won't be fired
            // Depending on the nature of your atom
            // it might behave differently in such circumstances
            // (like throwing an error, returning a default value etc)
            return new Date()
        }
    }

    tick() {
        this.currentDateTime = new Date()
        // let MobX know that this data source has changed
        this.atom.reportChanged()
    }

    startTicking() {
        this.tick() // initial tick
        this.intervalHandler = setInterval(() => this.tick(), 1000)
    }

    stopTicking() {
        clearInterval(this.intervalHandler)
        this.intervalHandler = null
    }
}

const clock = new Clock()

const disposer = autorun(() => console.log(clock.getTime()))

// ... prints the time each second

disposer()

// printing stops. If nobody else uses the same `clock` the clock will stop ticking as well.
```

# `onBecomeObserved` and `onBecomeUnobserved` [🚀]

Usage:

-   `onBecomeObserved(observable, property?, listener: () => void): (() => void)`
-   `onBecomeUnobserved(observable, property?, listener: () => void): (() => void)`

These functions are hooks into the observability system of MobX and get notified when observables _start_ / _stop_ becoming observed. It can be used to execute some lazy operations or perform network fetches.

The return value is a _diposer-function_ that will detach the _listener_.

```javascript
export class City {
    location
    temperature
    interval

    constructor(location) {
        makeAutoObservable(this, {
            resume: false,
            suspend: false
        })
        this.location = location
        // only start data fetching if temperature is actually used!
        onBecomeObserved(this, "temperature", this.resume)
        onBecomeUnobserved(this, "temperature", this.suspend)
    }

    resume = () => {
        log(`Resuming ${this.location}`)
        this.interval = setInterval(() => this.fetchTemperature(), 5000)
    }

    suspend = () => {
        log(`Suspending ${this.location}`)
        this.temperature = undefined
        clearInterval(this.interval)
    }

    fetchTemperature = flow(function* () {
        // data fetching logic
    })
}
```
