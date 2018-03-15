# Philosophy

The philosophy of MobX is:

**Anything that can be derived from the application state, should be derived. Automatically.**

We believe that:

1. The code you write should be as close as possible to the mental image you have of a problem domain. We avoid boilerplate like the plague.
1. Storing redundant data is a source of bugs. Don't build caches, instead, derive values from the state and leverage MobX to keep all your derivations in sync with state. With the least amount of computations possible.
2. Managing data subscriptions is better left to computers. Manual subscription management will ultimately result in under-subscribing (staleness bugs) or over-subscribing (starvation). MobX applies Transparent Reactive Programming to detect and manage data subscriptions automatically.
3. It should be impossible to ever observe a derived value that is stale.
