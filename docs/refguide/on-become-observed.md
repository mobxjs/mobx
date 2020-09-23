---
title: onBecomeObserved
sidebar_label: Lazy observables 🚀
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Creating lazy observables [🚀]

Usage:

-   `onBecomeObserved(observable, property?, listener: () => void): (() => void)`
-   `onBecomeUnobserved(observable, property?, listener: () => void): (() => void)`

Functions `onBecomeObserved` and `onBecomeUnobserved` can be used to attach lazy behavior or side-effects to existing observables. They are hooks into the observability system of MobX and get notified when the observables _start_ and _stop_ being observed.

You can use them to, for example, execute lazy operations or perform network fetches only when the observed value is actually in use. The return value is a _diposer-function_ that will detach the _listener_.

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
