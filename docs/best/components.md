# Organizing React Components

TODO:

`@observer` is quite similar to decorators like `@connect` as found in several flux libraries, yet there are some important differences.
1. `@observer` needs no configuration; dependencies will be detected automatically.
2. The subscriptions and updates of `@observer` are far more fine-grained;
exactly those values used in the last rendering will be observed, so there is no risk of over- or undersubscription.
Large applications really benefit from this in terms of simplicity performance.
3. This mechanism does not depend on the concept of context.

Rule of thumb is to use `observer` on every component in your application that is specific for your application.
With `@observer` there is no need to distinguish 'smart' components from 'dumb' components.
All components become responsible for updating when their _own_ dependencies change.
Its overhead is neglectable and it makes sure that whenever you start using observable data the component will respond to it.


Since in practice you will see that most reactive components become stateless, they can easily be hot-reloaded.
You will discover that many small components will consist of just a render function.
In such cases, you can also directly pass the render function to `observer`, without building a component.
The props will then be available as first argument of the function.

`observer` also prevents re-renderings when the *props* of the component have only shallowly changed, which makes a lot of sense if the data passed into the component is reactive.
This behavior is similar to [React PureRender mixin](https://facebook.github.io/react/docs/pure-render-mixin.html), except that *state* changes are still always processed.
If a component provides its own `shouldComponentUpdate`, that one takes precedence.
