---
sidebar_label: How to (not) use decorator syntax
title: How to (not) use decorators
hide_title: true
---

# How to (not) use decorators

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Using ES.next decorators in MobX is optional. This section explains how to use them, or how to avoid them.

Advantages of using decorator syntax:

-   Minimizes boilerplate, declarative.
-   Easy to use and read. A majority of the MobX users use them.

Disadvantages of using decorator syntax:

-   Stage-2 ES.next feature
-   Requires a little setup and transpilation, only supported with Babel / Typescript transpilation so far

You can approach using decorators in two ways in MobX

1.  Enable the currently experimental decorator syntax in your compiler (read on)
2.  Don't enable decorator syntax, but leverage the MobX built-in utility `decorate` to apply decorators to your classes / objects.

Using decorator syntax:

```javascript
import { observable, computed, action } from "mobx"

class Timer {
    @observable start = Date.now()
    @observable current = Date.now()

    @computed
    get elapsedTime() {
        return this.current - this.start + "milliseconds"
    }

    @action
    tick() {
        this.current = Date.now()
    }
}
```

Using the `decorate` utility:

```javascript
import { observable, computed, action, decorate } from "mobx"

class Timer {
    start = Date.now()
    current = Date.now()

    get elapsedTime() {
        return this.current - this.start + "milliseconds"
    }

    tick() {
        this.current = Date.now()
    }
}
decorate(Timer, {
    start: observable,
    current: observable,
    elapsedTime: computed,
    tick: action
})
```

For applying multiple decorators on a single property, you can pass an array of decorators. The decorators application order is from right to left.

```javascript
import { decorate, observable } from "mobx"
import { serializable, primitive } from "serializr"
import persist from "mobx-persist"

class Todo {
    id = Math.random()
    title = ""
    finished = false
}
decorate(Todo, {
    title: [serializable(primitive), persist("object"), observable],
    finished: [serializable(primitive), observable]
})
```

Note: Not all decorators can be composed together, and this functionality is just best-effort. Some decorators affect the instance directly and can 'hide' the effect of other decorators that only change the prototype.

---

The `observer` function from `mobx-react` is both a decorator and a function, that means that all these syntax variants will work:

```javascript
@observer
class Timer extends React.Component {
	/* ... */
}

const Timer = observer(class Timer extends React.Component {
	/* ... */
})

const Timer = observer((props) => (
	/* rendering */
))
```

## Enabling decorator syntax

If you want to use decorators follow the following steps.

**TypeScript**

Enable the compiler option `"experimentalDecorators": true` in your `tsconfig.json`.

**Babel 6: using `babel-preset-mobx`**

A more convenient way to setup Babel for usage with mobx is to use the [`mobx`](https://github.com/zwhitchcox/babel-preset-mobx) preset, that incorporates decorators and several other plugins typically used with mobx:

```
npm install --save-dev babel-preset-mobx
```

.babelrc:

```json
{
    "presets": ["mobx"]
}
```

**Babel 6: manually enabling decorators**

To enable support for decorators without using the mobx preset, follow the following steps.
Install support for decorators: `npm i --save-dev babel-plugin-transform-decorators-legacy`. And enable it in your `.babelrc` file:

```json
{
    "presets": ["es2015", "stage-1"],
    "plugins": ["transform-decorators-legacy"]
}
```

Note that the order of plugins is important: `transform-decorators-legacy` should be listed _first_.
Having issues with the babel setup? Check this [issue](https://github.com/mobxjs/mobx/issues/105) first.

**Babel 7**

Install support for decorators: `npm i --save-dev @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators`. And enable it in your `.babelrc` file:

```json
{
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["@babel/plugin-proposal-class-properties", { "loose": true }]
    ]
}
```

Note that the `legacy` mode is important (as is putting the decorators proposal first). Non-legacy mode is [WIP](https://github.com/mobxjs/mobx/pull/1732).

## Decorator syntax and Create React App (v1)

-   Decorators are not supported out of the box in `create-react-app@1.*`. To fix this, you can either use the `decorate` utility, eject, or use the [react-app-rewired](https://github.com/timarney/react-app-rewired/tree/master/packages/react-app-rewire-mobx) package.

## Decorator syntax and Create React App (v2)

-   Decorators are only supported out of the box when using TypeScript in `create-react-app@^2.1.1`. In older versions or when using vanilla JavaScript use either the `decorate` utility, eject, or the [customize-cra](https://github.com/arackaf/customize-cra) package.

---

## Disclamer: Limitations of decorator syntax:

_The current transpiler implementations of decorator syntax are quite limited and don't behave exactly the same.
Also, many compositional patterns are currently not possible with decorators, until the stage-2 proposal has been implemented by all transpilers.
For this reason the scope of decorator syntax support in MobX is currently scoped to make sure that the supported features
behave consistently accross all environments_

The following patterns are not officially supported by the MobX community:

-   Redefining decorated class members in inheritance trees
-   Decorating static class members
-   Combining decorators provided by MobX with other decorators
-   Hot module reloading (HMR) / React-hot-loader might not work as expected

Decorated properties might not be visible yet on class instances as _own_ property until the first read / write to that property occurred.

(N.B.: not supported doesn't mean it doesn't work, it means that if it doesn't work, reported issues will not be processed until the official spec has been moved forward)
