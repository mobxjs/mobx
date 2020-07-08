---
sidebar_label: Frequently Asked Questions
title: FAQ
hide_title: true
---

## FAQ

##### Which browsers are supported?

MobX works in any ES5 environment, which includes browsers and NodeJS.

There are some [limitations](../best/limitations-without-proxies.md) for
environments that do not support `Proxy` (modern browsers
all support `Proxy`).

##### Is MobX a framework?

MobX gives you a lot of freedom in how you structure your code, where to store state or how to process events. It might free you from frameworks that pose all kinds of restrictions on your code in the name of performance.

For state management frameworks built with MobX that offer advanced features, see [mobx-state-tree](https://mobx-state-tree.js.org/) and [mobx-keystone](https://mobx-keystone.js.org/).

##### Is React Native supported?

Yes, `mobx` and `mobx-react` will work on React Native. The latter through importing `"mobx-react/native"`.
The devtools don't support React Native.

##### Where can I find more MobX resources?

We've compiled a large list of helpful resources of all types in the [official awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx). If you feel it's missing something, please open an [issue](https://github.com/mobxjs/awesome-mobx/issues/new) or [pull request](https://github.com/mobxjs/awesome-mobx/compare) to describe what you're looking for or share your added links :).

#### Does MobX have TypeScript support?

It works out of the box. MobX is written with TypeScript and type definitions are built-in.

##### While using Typescript I get `error TS2304: Cannot find name 'AsyncGenerator'`

Edit your `tsconfig.json` and ensure your `lib` section array includes `es2018.asynciterable` or one of its super-sets (e.g. `es2018` or `esnext`). Note that this won't affect code generation in anyway, it just affects the standard type definitions the Typescript compiler will use, which should be a safe change. If your `tsconfig.json` does not include a lib section the defaults are:

-   ES5 target: DOM,ES5,ScriptHost
-   ES6 target: DOM,ES6,DOM.Iterable,ScriptHost

So you'd need to add `es2018.asynciterable` to those defaults in this particular case.

#### Importing from wrong location

Because MobX ships with typescript typings out of the box, some import autocompleting tools (at least in VSCode) have the habit of auto completing with a wrong import, like

```javascript
// wrong
import { observable } from "mobx/lib/mobx"
```

This is incorrect but will not always immediately lead to runtime errors. So be aware. The only correct way of importing anything from the `mobx` package is:

```javascript
// correct
import { observable } from "mobx"
```

#### Does MobX have Flow typing support?

MobX ships with [flow typings](https://github.com/mobxjs/mobx/blob/master/flow-typed/mobx.js). Flow will automatically include them when you import mobx modules. Although you **do not** need to import the types explicitly, you can still do it like this: `import type { ... } from 'mobx'`.

To use the [flow typings](https://github.com/mobxjs/mobx/blob/master/flow-typed/mobx.js) shipped with MobX:

-   In `.flowconfig`, you **cannot** ignore `node_modules`.
-   In `.flowconfig`, you **cannot** import it explicitly in the `[libs]` section.
-   You **do not** need to install library definition using [flow-typed](https://github.com/flowtype/flow-typed).

##### Can I combine MobX with Flux / Redux?

You don't need to.

MobX already optimizes rendering, and it works with most kinds of data, including cycles and classes. So other programming paradigms like classic MVC can now be easily applied in applications that combine ReactJS with MobX.

[⚛️] Flux implementations that do not work with the requirement that the data in their stores is immutable should work well with MobX. Redux does have this immutability requirement. Note that both mobx-state-tree and mobx-keystone add additional constraints to support better integration with Redux.

##### How does MobX compare to other Reactive frameworks?

[⚛️] See this [issue](https://github.com/mobxjs/mobx/issues/18) for some considerations.

##### Can I record states and re-hydrate them?

The frameworks built on top of MobX [mobx-state-tree](https://mobx-state-tree.js.org/) and [mobx-keystone](https://mobx-keystone.js.org/) can both do this for you.

[⚛️] To roll your own, [createTransformer in mobx-utils](https://github.com/mobxjs/mobx-utils) has some examples.

##### Can MobX be combined with RxJS?

[⚛️] Yes, you can use [toStream and fromStream from mobx-utils](https://github.com/mobxjs/mobx-utils#tostream) to use RXJS and other TC 39 compatible observables with mobx.

##### When to use RxJS instead of MobX?

[⚛️] For anything that involves explictly working with the concept of time,
or when you need to reason about the historical values / events of an observable (and not just the latest), RxJs is recommended as it provides more low-level primitives.
Whenever you want to react to _state_ instead of _events_, MobX offers an easier and more high-level approach.
In practice, combining RxJS and MobX might result in really powerful constructions.
Use for example RxJS to process and throttle user events and as a result of that update the state.
If the state has been made observable by MobX, it will then take care of updating the UI and other derivations accordingly.

##### Can I use MobX together with framework X?

Probably.
MobX is framework agnostic and can be applied in any modern JS environment.
It just ships with a small function to transform ReactJS components into reactive view functions for convenience.
MobX works just as well server side, and is already combined with jQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b).

##### Can you tell me how it works?

[⚛️] Sure, join the [gitter chat](https://gitter.im/mobxjs/mobx) or check out the code. Or, submit an issue to motivate me to make some nice drawings :).
And look at this [Medium article](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).
