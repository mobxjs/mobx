---
sidebar_label: Frequently Asked Questions
title: FAQ
hide_title: true
---

## FAQ

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

##### Which browsers are supported?

See the [browser support](https://mobx.js.org/README.html#browser-support).

##### While using Typescript I get `error TS2304: Cannot find name 'AsyncGenerator'`

Edit your `tsconfig.json` and ensure your `lib` section array includes `es2018.asynciterable` or one of its super-sets (e.g. `es2018` or `esnext`). Note that this won't affect code generation in anyway, it just affects the standard type definitions the Typescript compiler will use, which should be a safe change. If your `tsconfig.json` does not include a lib section the defaults are:

-   ES5 target: DOM,ES5,ScriptHost
-   ES6 target: DOM,ES6,DOM.Iterable,ScriptHost

So you'd need to add `es2018.asynciterable` to those defaults in this particular case.

##### Can MobX be combined with RxJS?

Yes, you can use [toStream and fromStream from mobx-utils](https://github.com/mobxjs/mobx-utils#tostream) to use RXJS and other TC 39 compatible observables with mobx.

##### When to use RxJS instead of MobX?

For anything that involves explictly working with the concept of time,
or when you need to reason about the historical values / events of an observable (and not just the latest), RxJs is recommended as it provides more low-level primitives.
Whenever you want to react to _state_ instead of _events_, MobX offers an easier and more high-level approach.
In practice, combining RxJS and MobX might result in really powerful constructions.
Use for example RxJS to process and throttle user events and as a result of that update the state.
If the state has been made observable by MobX, it will then take care of updating the UI and other derivations accordingly.

##### Is React Native supported?

Yes, `mobx` and `mobx-react` will work on React Native. The latter through importing `"mobx-react/native"`.
The devtools don't support React Native. Note that if you indend to use your observer components with hot reloading, decorators in the components may not always work. If that is the case, use the functions instead (eg. `action(fn)` instead of `@action` or `observer(component)` instead of `@observer`).

##### How does MobX compare to other Reactive frameworks?

See this [issue](https://github.com/mobxjs/mobx/issues/18) for some considerations.

##### Is MobX a framework?

MobX is _not_ a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.

##### Can I combine MobX with Flux?

Flux implementations that do not work on the assumption that the data in their stores is immutable should work well with MobX.
However, the need for Flux is reduced when using MobX.
MobX already optimizes rendering, and it works with most kinds of data, including cycles and classes.
So other programming paradigms like classic MVC can now be easily applied in applications that combine ReactJS with MobX.

##### Can I use MobX together with framework X?

Probably.
MobX is framework agnostic and can be applied in any modern JS environment.
It just ships with a small function to transform ReactJS components into reactive view functions for convenience.
MobX works just as well server side, and is already combined with jQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b).

##### Can I record states and re-hydrate them?

Yes, see [createTransformer](http://mobxjs.github.io/mobx/refguide/create-transformer.html) for some examples.

##### Can you tell me how it works?

Sure, join the reactiflux channel or checkout the code. Or, submit an issue to motivate me to make some nice drawings :).
And look at this [Medium article](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).

##### Where can I find more MobX resources?

We've compiled a large list of helpful resources of all types in the [official awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx). If you feel it's missing something, please open an [issue](https://github.com/mobxjs/awesome-mobx/issues/new) or [pull request](https://github.com/mobxjs/awesome-mobx/compare) to describe what you're looking for or share your added links :).
