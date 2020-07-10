---
sidebar_label: Decorators in MobX [🚀]
hide_title: true
---

# Decorators in MobX [🚀]

MobX before version 6 encouraged the use of ES.next decorators to mark things as `observable`, `computed` and `action`. Decorators are not currently a ES standard however, and the process of standardization is taking a long time. It also looks like the standard will be different from the way decorators were implemented previously. In the interest of compatibility we have chosen to move away from them in MobX 6, and recommend the use of [`makeObservable` / `makeAutoObservable`](../refguide/make-observable) instead.

But many existing code bases use decorators, and a lot of the documentation and tutorial material online uses them as well. The rule is that anything you can use as an annotation to `makeObservable`, such as `observable`, `action` and `computed`, you can also use as a decorator. So let's examine what that looks like:

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

MobX before version 6 did not require the `makeObservable(this)` call in the constructor, but because it makes the implementation of decorator simpler and more compatible, it now does. This instructs MobX to make the instances observable following the information in the decorators -- the decorators take the place of the second argument to `makeObservable`.

We intend to continue to support decorators in this form.

## Decorator differences

-   You cannot pass (options)[../refguide/computed-options] into `@computed` when `computed` is used as a decorator. `computed.struct` is available to enable strucural comparison.

## Upgrading your code with the `mobx-undecorate` codemod

If you are an existing MobX user you have code that uses a lot of decorators, or the equivalent calls to `decorate`.

The [`mobx-undecorate`](https://www.npmjs.com/package/mobx-undecorate) package provides a codemod that can automatically update your code to be conformant to MobX 6. There is no need to install it; instead you download and execute it using the [`npx`](https://www.npmjs.com/package/npx) tool which you do need to install if you haven't already.

To get rid of all uses of MobX decorators and replace them with the equivalent `makeObservable` calls, go to the directory that contains your source code and run:

```shell
npx mobx-undecorate
```

MobX will continue to support decorators -- so if you want to retain them
and only introduce `makeObservable(this)` where required, you can use the `--keepDecorators` option:

```shell
npx mobx-undecorate --keepDecorators
```

### limitations of `mobx-undecorate`

The `mobx-undecorate` command has to introduce a constructor in classes that do not yet have one. If base class of the constructor expects arguments, the codemod cannot introduce these arguments for the subclass being upgraded, and the `super` call won't pass them either. You have to fix these manually.

`mobx-undecorate` outputs warnings for these cases when it's run.

We do have a special case for React class components to do the right thing and
pass along `props` to the superclass.

## How to enable decorator support

We do not recommend new codebases that use MobX use decorators until the point when they become an official part of the language, but you can still use them. It does require setup for transpilation: you have to use Babel or TypeScript.

### TypeScript

Enable the compiler option `"experimentalDecorators": true` in your `tsconfig.json`.

### Babel 7

Install support for decorators: `npm i --save-dev @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators`. And enable it in your `.babelrc` file:

```json
{
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["@babel/plugin-proposal-class-properties", { "loose": true }]
    ]
}
```

Note that the `legacy` mode is important (as is putting the decorators proposal first).

### Decorator syntax and Create React App (v2)

Decorators are only supported out of the box when using TypeScript in `create-react-app@^2.1.1` and newer. In older versions or when using vanilla JavaScript use eject, or the [customize-cra](https://github.com/arackaf/customize-cra) package.

### Using `observer` from `mobx-react`

The `observer` function from `mobx-react` is both a decorator and a function, that means that all these syntax variants will work:

```javascript
const Timer = observer((props) => (
	/* rendering */
))

const Timer = observer(class Timer extends React.Component {
	/* ... */
})

@observer
class Timer extends React.Component {
	/* ... */
}
```

## Disclaimer: Limitations of decorator syntax:

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
