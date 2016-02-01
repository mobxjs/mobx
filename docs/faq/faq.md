## FAQ

##### Which browsers are supported?

Mobservable runs on any ES5 environment. That means that all browsers except IE8, Node.js and Rhine are supported. See [caniuse.com](http://caniuse.com/#feat=es5)

##### Can Mobservable be combined with RxJS?
Yes, see the [rx-mobservable](https://www.npmjs.com/package/rx-mobservable) interoperability package.

##### When to use RxJS instead of Mobservable?
For anything that involves explictly working with the concept of time such,
or when you need to combine reason about the historical values / events of an observable (and not just th elatest) RxJs is recommended as it provides the more low level primitives.
Whenever you want react to _state_ instead of _events_, Mobservable offers an easier and more high level approach.

##### Is React Native supported?

Yes, `mobservable` and `mobservable-react` will work on React Native. The latter through importing `"mobservable-react/native"`.
The devtools don't support React Native.

##### How does Mobservable compare to other Reactive frameworks?

See this [issue](https://github.com/mweststrate/mobservable/issues/18) for some considerations.

##### Is mobservable a framework?

Mobservabe is *not* a framework. It does not tell you how to structure your code, where to store state or how to process events. Yet it might free you from frameworks that poses all kinds of restrictions on your code in the name of performance.

##### Does mobservable and mobservable-react work on react native?

Yes.

##### Can I combine mobservable with flux?

Flux implementations that do not work on the assumption that the data in their stores is immutable should work well with mobservable.
However, the need for flux is less when using mobservable.
Mobservable already optimizes rendering and since it works with most kinds of data, including cycles and classes.
So other programming paradigms like classic MVC are now can be easily applied in applications that combine ReactJS with mobservable.

##### Can I use mobservable together with framework X?

Probably.
Mobservable is framework agnostic and can be applied in any JS environment.
It just ships with a small function to transform Reactjs components into reactive view functions for convenience.
Mobservable works just as well server side, and is already combined with JQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)) and [Deku](https://gist.github.com/mattmccray/d8740ea97013c7505a9b).

##### Why should I use Mobservable instead of reactive library X?

See: https://github.com/mweststrate/mobservable/issues/18

##### Can I record states and re-hydrate them?

Yes, see [createTransformer](http://mweststrate.github.io/mobservable/refguide/create-transformer.html) for some examples.

##### Can you tell me how it works?

Sure, join the reactiflux channel our checkout [dnode.ts](lib/dnode.ts). Or, submit an issue to motivate me to make some nice drawings :).
