## FAQ

##### Which browsers are supported?

MobX runs on any ES5 environment. That means that all browsers except IE8, Node.js and Rhine are supported. See [caniuse.com](http://caniuse.com/#feat=es5)

##### Can MobX be combined with RxJS?
Yes, see the [rx-mobx](https://www.npmjs.com/package/rx-mobx) interoperability package.

##### When to use RxJS instead of MobX?
For anything that involves explictly working with the concept of time,
or when you need to reason about the historical values / events of an observable (and not just the latest) RxJs is recommended as it provides the more low level primitives.
Whenever you want react to _state_ instead of _events_, MobX offers an easier and more high level approach.
In practice, combining `RxJS` and `MobX` might result in really powerful constructions.
Use for example `RxJS` to process and throttle user events and as a result of that update the state.
If the state has been made observable by `mobx`, `mobx` will then take care of updating the UI and other derivations accordingly. 

##### Is React Native supported?

Yes, `mobx` and `mobx-react` will work on React Native. The latter through importing `"mobx-react/native"`.
The devtools don't support React Native.

##### How does MobX compare to other Reactive frameworks?

See this [issue](https://github.com/mobxjs/mobx/issues/18) for some considerations.

##### Is mobx a framework?

Mobservabe is *not* a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.

##### Does mobx and mobx-react work on react native?

Yes.

##### Can I combine mobx with flux?

Flux implementations that do not work on the assumption that the data in their stores is immutable should work well with mobx.
However, the need for flux is less when using mobx.
MobX already optimizes rendering and since it works with most kinds of data, including cycles and classes.
So other programming paradigms like classic MVC are now can be easily applied in applications that combine ReactJS with mobx.

##### Can I use mobx together with framework X?

Probably.
MobX is framework agnostic and can be applied in any JS environment.
It just ships with a small function to transform Reactjs components into reactive view functions for convenience.
MobX works just as well server side, and is already combined with JQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b).

##### Can I record states and re-hydrate them?

Yes, see [createTransformer](http://mobxjs.github.io/mobx/refguide/create-transformer.html) for some examples.

##### Can you tell me how it works?

Sure, join the reactiflux channel our checkout [dnode.ts](lib/dnode.ts). Or, submit an issue to motivate me to make some nice drawings :).
