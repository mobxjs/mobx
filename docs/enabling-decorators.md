---
title: Enabling decorators
sidebar_label: Enabling decorators {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Enabling Decorators

After years of alterations, ES decorators have finally reached Stage 3 in the TC39 process, meaning that they are quite stable and won't undergo breaking changes again like the previous decorator proposals have. MobX has implemented support for this new "2022.3/Stage 3" decorator syntax. If you're looking for information on "legacy" decorators, look below or refer to older versions of the documentation.

2022.3 Decorators are supported in Babel (see https://babeljs.io/docs/babel-plugin-proposal-decorators) and in TypeScript (5.0+).

## Usage

```javascript
import { observable, computed, action } from "mobx"

class Todo {
    id = Math.random()
    @observable accessor title = ""
    @observable accessor finished = false

    @action
    toggle() {
        this.finished = !this.finished
    }
}

class TodoList {
    @observable accessor todos = []

    @computed
    get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length
    }
}
```

Notice the usage of the new `accessor` keyword when using `@observable`.
It is part of the 2022.3 spec and is required if you want to use decorators without `makeObservable()`.
That being said, you _can_ do without it if you continue to call `makeObservable()` like so:

```javascript
class Todo {
    @observable title = ""

    constructor() {
        makeObservable(this)
    }
}
```

## Changes/Gotchas

MobX' 2022.3 Decorators are very similar to the pre-MobX 6 decorators, so usage is mostly the same, but there are some gotchas:

-   `@observable accessor` decorators are _not_ enumerable. `accessor`s do not have a direct equivalent in the past - they're a new concept in the language. We've chosen to make them non-enumerable, non-own properties in order to better follow the spirit of the ES language and what `accessor` means.  
    The main cases for enumerability seem to have been around serialization and rest destructuring.
    -   Regarding serialization, implicitly serializing all properties probably isn't ideal in an OOP-world anyway, so this doesn't seem like a substantial issue (consider implementing `toJSON` or using `serializr` as possible alternatives)
    -   Addressing rest-destructuring, such is an anti-pattern in MobX - doing so would (likely unwantedly) touch all observables and make the observer overly-reactive).
-   `@action some_field = () => {}` was and is valid usage (_if_ `makeObservable()` is also used). However, `@action accessor some_field = () => {}` is never valid.

## Legacy Decorators

We do not recommend new codebases that use MobX use legacy decorators until the point when they become an official part of the language, but you can still use them. It does require setup for transpilation so you have to use Babel or TypeScript.

## MobX Core decorators {🚀}

MobX before version 6 encouraged the use of ES.next decorators to mark things as `observable`, `computed` and `action`. While MobX 6 recommends against using these decorators (and instead using [`makeObservable` / `makeAutoObservable`](observable-state.md)), it is still possible.

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
        this.finished = !this.finished
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

### Using `observer` as a decorator

The `observer` function from `mobx-react` is both a function and a decorator that can be used on class components:

```javascript
@observer
class Timer extends React.Component {
    /* ... */
}
```

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

### Disclaimer: Limitations of the legacy decorator syntax

The current transpiler implementations of the decorator syntax are quite limited and don't behave exactly the same.
Also, many compositional patterns are currently not possible with decorators, until the stage-2 proposal has been implemented by all transpilers.
For this reason the scope of decorator syntax support in MobX is currently scoped to make sure that the supported features
behave consistently across all environments.

The following patterns are not officially supported by the MobX community:

-   Redefining decorated class members in inheritance trees
-   Decorating static class members
-   Combining decorators provided by MobX with other decorators
-   Hot module reloading (HMR) / React-hot-loader might not work as expected
