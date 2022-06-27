---
title: Creating lazy observables
sidebar_label: Lazy observables {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Creating lazy observables {🚀}

Usage:

-   `onBecomeObserved(observable, property?, listener: () => void): (() => void)`
-   `onBecomeUnobserved(observable, property?, listener: () => void): (() => void)`

Functions `onBecomeObserved` and `onBecomeUnobserved` can be used to attach lazy behavior or side effects to existing observables. They hook into the observability system of MobX and get notified when an observable _starts_ and _stops_ becoming observed. They both return a _disposer_ function that detaches the _listener_.

In the example below we use them to perform network fetches only when the observed value is actually in use.

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
        // Only start data fetching if temperature is actually used!
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
        // Data fetching logic...
    })
}
```
