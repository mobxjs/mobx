---
title: Enabling decorators
sidebar_label: Enabling decorators {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Enabling decorators {🚀}

MobX before version 6 encouraged the use of ES.next decorators to mark things as `observable`, `computed` and `action`. However, decorators are currently not an ES standard, and the process of standardization is taking a long time. It also looks like the standard will be different from the way decorators were implemented previously. In the interest of compatibility we have chosen to move away from them in MobX 6, and recommend the use of [`makeObservable` / `makeAutoObservable`](observable-state.md) instead.

But many existing codebases use decorators, and a lot of the documentation and tutorial material online uses them as well. The rule is that anything you can use as an annotation to `makeObservable`, such as `observable`, `action` and `computed`, you can also use as a decorator. So let's examine what that looks like:

```javascript
import { makeObservable, observable, computed, action } from "mobx"

class Todo {
    id = Math.random()
    @observable title = ""
    @observable finished = false

    constructor() {
        makeObservable(this)
    }

    @action
    toggle() {
        this.finished = !finished
    }
}

class TodoList {
    @observable todos = []

    @computed
    get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length
    }

    constructor() {
        makeObservable(this)
    }
}
```

MobX before version 6 did not require the `makeObservable(this)` call in the constructor, but because it makes the implementation of decorator simpler and more compatible, it now does. This instructs MobX to make the instances observable following the information in the decorators – the decorators take the place of the second argument to `makeObservable`.

We intend to continue to support decorators in this form.
Any existing MobX 4/5 codebase can be migrated to use `makeObservable` calls by our [code-mod](https://www.npmjs.com/package/mobx-undecorate).
When migrating from MobX 4/5 to 6, we recommend to always run the code-mod, to make sure the necessary `makeObservable` calls are generated.

Check out the [Migrating from MobX 4/5 {🚀}](migrating-from-4-or-5.md) section.

## Using `observer` as a decorator

The `observer` function from `mobx-react` is both a function and a decorator that can be used on class components:

```javascript
@observer
class Timer extends React.Component {
    /* ... */
}
```

## How to enable decorator support

We do not recommend new codebases that use MobX use decorators until the point when they become an official part of the language, but you can still use them. It does require setup for transpilation so you have to use Babel or TypeScript.

### TypeScript

Enable the compiler option `"experimentalDecorators": true` and `"useDefineForClassFields": true` in your `tsconfig.json`.

### Babel 7

Install support for decorators: `npm i --save-dev @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators`. And enable it in your `.babelrc` file (note that the order is important):

```javascript
{
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["@babel/plugin-proposal-class-properties", { "loose": false }]
        // In contrast to MobX 4/5, "loose" must be false!    ^
    ]
}
```

### Decorator syntax and Create React App (v2)

Decorators are only supported out of the box when using TypeScript in `create-react-app@^2.1.1` and newer. In older versions or when using vanilla JavaScript use eject, or the [customize-cra](https://github.com/arackaf/customize-cra) package.

## Disclaimer: Limitations of the decorator syntax

The current transpiler implementations of the decorator syntax are quite limited and don't behave exactly the same.
Also, many compositional patterns are currently not possible with decorators, until the stage-2 proposal has been implemented by all transpilers.
For this reason the scope of decorator syntax support in MobX is currently scoped to make sure that the supported features
behave consistently across all environments.

The following patterns are not officially supported by the MobX community:

-   Redefining decorated class members in inheritance trees
-   Decorating static class members
-   Combining decorators provided by MobX with other decorators
-   Hot module reloading (HMR) / React-hot-loader might not work as expected
