---
sidebar_label: Decorators in MobX
title: Decorators in MobX
hide_title: true
---

# Decorators in MobX

MobX before version 6 encouraged the use of ES.next decorators to mark things as observable, computed and action. Decorators are not currently a ES standard however, and the process of standardization is taking a long time. In MobX6 in the interest of compatibility we have chosen to move away from them, and use `makeObservable()`/`makeAutoObservable()` instead.

But many existing code bases that use MobX still use them, and a lot of the documentation material online uses them as well. You can still use them with MobX 6 too! So let's examine what they look like:

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

MobX before version 6 did not require the `makeObservable(this)` call in the constructor, but because it makes the implementation of decorator simpler and more compatible, MobX now does. This instructs MobX to make the instances observable following the information in the decorators -- the decorators take the place of the second argument to `makeObservable`.

## Upgrading using the `undecorate` codemod

If you are a MobX user you have code that uses a lot of decorators, or the equivalent calls to `decorate`.

You can convert your project using [jscodeshift](https://github.com/facebook/jscodeshift), which
is a dev dependency of MobX.

Convert all files in directory `src`. This gets rid of all uses of MobX decorators and
replaces them with the equivalent `makeObservable(this, {...})` invocation:

```shell
yarn jscodeshift -t mobx/codemod/undecorator.ts --extensions=js,jsx,ts,tsx src
```

If you want to retain decorators and only introduce `makeObservable(this)` where you
required, you can use the `--keepDecorators` option:

```shell
yarn jscodeshift -t mobx/codemod/undecorate.ts --extensions=js,jsx,ts,tsx src --keepDecorators=true
```

Convert single file and everything it imports:

```shell
yarn jscodeshift -t mobx/codemod/undecorate.ts myfile.js
```

Convert an individual file, leaving any imports unchanged using `--ignoreImports`:

```shell
yarn jscodeshift -t mobx/codemod/undecorate.ts myfile.js --ignoreImports=true
```

## How to enable decorator support

We do not recommend new codebases that use MobX use decorators until such point as they become
an official part of the language, but you can still use them. It does require setup for transpilation: you have to use Babel or TypeScript.

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

-   Decorators are only supported out of the box when using TypeScript in `create-react-app@^2.1.1` and newer. In older versions or when using vanilla JavaScript use eject, or the [customize-cra](https://github.com/arackaf/customize-cra) package.

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
