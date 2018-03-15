# Installation

## Pick your version: MobX 4 or MobX 15

* MobX 4 runs on any ES5 compatible environment, which is basically any javascript engine except IE 8. Due to this wide support of JavaScript engines there are some [caveats](caveats.md)
* MobX 15 uses `Proxy`. This avoids all of the above caveats, however it means that Microsoft Internet Explorer is not supported (Microsoft Edge is), and React Native for Android only after [upgrading JavaScriptCore](https://github.com/SoftwareMansion/jsc-android-buildscripts)

Please pick the version that matches your project requirements. Downgrading is possible in general, but might require some additional work.

## NPM / YARN

* `npm install mobx --save` (or `mobx@4`)

## CDN

* https://unpkg.com/mobx/lib/mobx.umd.js (`umd.min.js` for the minified version)

## Typings

Mobx application are very suitable for static type checking.
TypeScript and Flow typings are included in the package, and should be picked up automatically in any TypeScript / Flow project.

## Framework specific bindings

When using MobX in client side applications, you might want to make components MobX aware.
That is; enable them to react to state changes automatically.
Some frequently used bindings that can be `npm install`ed are:

* [`mobx-react`](https://github.com/mobxjs/mobx-react)
* [`mobx-angular`](https://github.com/mobxjs/mobx-angular)
* [`mobx-preact`](https://github.com/mobxjs/mobx-preact)

It is pretty easy to create your own bindings as well. For example to use MobX together with JQuery.
Head over to the [resources](resources.md) section for more bindings and inspiration.

## Decorators

TODO: decorators

bla

TS

babel 6 / 7/ / RN

https://github.com/mobxjs/mobx/issues/1410

babel deep action?