---
"mobx": minor
"mobx-react-lite": minor
---

`action`, `computed`, `flow` defined on prototype can be overriden by subclass via `override` annotation/decorator. Previously broken.
Overriding anything defined on instance itself (`this`) is not supported and should throw. Previously partially possible or broken.
Attempt to re-annotate property always throws. Previously mostly undefined outcome.
All annotated and non-observable props (action/flow) are non-writable. Previously writable.
All annotated props of non-plain object are non-configurable. Previously configurable.
Observable object should now work more reliably in various (edge) cases.
Proxied objects now support `Object.defineProperty`. Previously unsupported/broken.
`extendObservable/makeObservable/defineProperty` notifies observers/listeners/interceptors about added props. Peviously inconsistent.
`keys/values/entries` works like `Object.keys/values/entries`. Previously included only observables.
`has` works like `in`. Previously reported `true` only for existing own observable props.
`set` no longer transforms existing non-observable prop to observable prop, but simply sets the value.
`remove/delete` works with non-observable and computed props. Previously unsupported/broken.
Passing `options` to `observable/extendObservable/makeObservable` throws if the object is already observable . Previously passed options were mostly ignored.
`autoBind` option is now sticky - same as `deep` and `name` option.
`observable/extendObservable` now also picks non-enumerable keys (same as `make[Auto]Observable`).
Removed deprecated `action.bound("name")`
Proxied objects should be compatible with `Reflect` API. Previously throwing instead of returning booleans.
