---
title: Decorators
sidebar_label: Decorators {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Decorators

## Enabling decorators

After years of alterations, ES decorators have finally reached Stage 3 in the TC39 process, meaning that they are quite stable and won't undergo breaking changes again like the previous decorator proposals have. MobX has implemented support for this new "2022.3/Stage 3" decorator syntax.
With modern decorators, it is no longer needed to call `makeObservable` / `makeAutoObservable`.

2022.3 Decorators are supported in:

-   TypeScript (5.0 and higher, make sure that the `experimentalDecorators` flag is NOT enabled). [Example commit](https://github.com/mweststrate/currencies-demo/commit/acb9ac8c148e8beef88042c847bb395131e85d60).
-   For Babel make sure the plugin [`proposal-decorators`](https://babeljs.io/docs/babel-plugin-proposal-decorators) is enabled with the highest version (currently `2023-05`). [Example commit](https://github.com/mweststrate/currencies-demo/commit/4999d2228208f3e1e10bc00a272046eaefde8585).

```js
// tsconfig.json
{
    "compilerOptions": {
        "experimentalDecorators": false /* or just remove the flag */
    }
}

// babel.config.json (or equivalent)
{
    "plugins": [
        [
            "@babel/plugin-proposal-decorators",
            {
                "version": "2023-05"
            }
        ]
    ]
}
```

-   Vite configuration

```js
// vite.config.js
{
    plugins: [
        react({
            babel: {
                plugins: [
                    [
                        "@babel/plugin-proposal-decorators",
                        {
                            version: "2023-05"
                        }
                    ]
                ]
            }
        })
    ]
}
```

## Using decorators

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
It is part of the 2022.3 spec and is required if you want to use modern decorators.

<details id="migrate-decorators"><summary>Migrating from legacy decorators</summary>

To migrate from legacy decorators to modern decorators, perform the following steps:

1. Disable / remove the `experimentalDecorators` flag from your TypeScript configuration (or Babel equivalent)
2. Remove all `makeObservable(this)` calls from class constructors that use decorators.
3. Replace all instances of `@observable` (and variations) with `@observable accessor`

Please note that adding `accessor` to a class property will change it into `get` and `set` class methods. Unlike class properties, class methods are not enumerable. This may introduce new behavior with some APIs, such as `Object.keys`, `JSON.stringify`, etc.

</details>

<details id="gotchas"><summary>Decorator changes / gotchas</summary>

MobX' 2022.3 decorators have some gotchas:

-   `@observable accessor` decorators are _not_ enumerable. `accessor`s do not have a direct equivalent in the past - they're a new concept in the language. We've chosen to make them non-enumerable, non-own properties in order to better follow the spirit of the ES language and what `accessor` means.
    The main cases for enumerability seem to have been around serialization and rest destructuring.
    -   Regarding serialization, implicitly serializing all properties probably isn't ideal in an OOP-world anyway, so this doesn't seem like a substantial issue (consider implementing `toJSON` or using `serializr` as possible alternatives)
    -   Addressing rest-destructuring, such is an anti-pattern in MobX - doing so would (likely unwantedly) touch all observables and make the observer overly-reactive).
-   `@action some_field = () => {}` is valid usage. If a superclass has a field decorated by `@action`, a subclass can override the field. However, the field on the subclass is not an action unless it is also decorated with `@action` in the subclass declaration.

</details>

## Using `observer` as a decorator

The `observer` function from `mobx-react` is both a function and a decorator that can be used on class components:

```javascript
@observer
class Timer extends React.Component {
    /* ... */
}
```
