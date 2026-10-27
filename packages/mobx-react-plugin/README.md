# mobx-react-plugin

Write plain React components and plain `async` store methods; the plugin adds the MobX wiring at build time. It does three things, each of which can be switched off:

1. wraps every React component in [`observer`](https://mobx.js.org/react-integration.html), so you can never forget it;
2. adds the `"use no memo"` directive to components and hooks, so [React Compiler](https://react.dev/learn/react-compiler) leaves them to MobX;
3. turns `async` methods of observable classes and objects into [flows](https://mobx.js.org/actions.html#using-flow-instead-of-async--await-), so state changes after `await` need no `runInAction`.

So this code:

```tsx
export function Dice() {
    return (
        <button disabled={dice.isRolling} onClick={() => dice.roll()}>
            {dice.isRolling ? "Rolling..." : `You rolled ${dice.value}`}
        </button>
    )
}

class DiceStore {
    value = 1
    isRolling = false

    constructor() {
        makeAutoObservable(this)
    }

    async roll() {
        this.isRolling = true
        await sleep(1000)
        this.value = Math.ceil(Math.random() * 6)
        this.isRolling = false
    }
}
```

is compiled into:

```tsx
import { observer } from "mobx-react-lite"

export const Dice = observer(function Dice() {
    "use no memo"

    return (
        <button disabled={dice.isRolling} onClick={() => dice.roll()}>
            {dice.isRolling ? "Rolling..." : `You rolled ${dice.value}`}
        </button>
    )
})

class DiceStore {
    value = 1
    isRolling = false

    constructor() {
        makeAutoObservable(this)
    }

    *roll() {
        this.isRolling = true
        yield sleep(1000)
        this.value = Math.ceil(Math.random() * 6)
        this.isRolling = false
    }
}
```

Components also keep their names in React DevTools (arrow functions become named function expressions), and "go to definition" in your editor lands on a plain `function` declaration.

## Installation

```sh
npm install --save-dev mobx-react-plugin
```

The generated code imports `observer` from `mobx-react-lite` (configurable through [`importSource`](#options)), so `mobx-react-lite` (or `mobx-react`) must be a dependency of your app.

## Requirements

The latest MobX and, for the Vite plugin, the latest Vite. Older versions are not supported.

## Setup

`mobx-react-plugin` is a Babel plugin (`mobx-react-plugin/babel`), so it works with any bundler that runs Babel. For Vite there is also a Vite plugin (`mobx-react-plugin/vite`) that runs the same Babel plugin before any other plugin, including React plugins that do not use Babel.

With Babel and React Compiler, list this plugin **before** the compiler in the `plugins` array.

### Vite

```ts
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import mobxReactPlugin from "mobx-react-plugin/vite"

export default defineConfig({
    plugins: [mobxReactPlugin(), react()]
})
```

This works with `@vitejs/plugin-react`, `@vitejs/plugin-react-swc` and `@vitejs/plugin-react-oxc`, with or without React Compiler.

With React Compiler through `@vitejs/plugin-react` and `@rolldown/plugin-babel`:

```ts
import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import mobxReactPlugin from "mobx-react-plugin/vite"

export default defineConfig({
    plugins: [mobxReactPlugin(), react(), babel({ presets: [reactCompilerPreset()] })]
})
```

The Vite plugin runs its own Babel pass with only this plugin, so it has to enable parser syntax itself. It enables `jsx`, `typescript` (for `.ts`/`.tsx`), `decorators` and `decoratorAutoAccessors`. If you use other syntax, pass [`parserPlugins`](#vite-plugin-options), for example `parserPlugins: ["decorators-legacy"]`.

### React Native and Expo

Metro uses Babel, so the plugin goes into `babel.config.js`:

```js
// babel.config.js
module.exports = {
    presets: ["module:@react-native/babel-preset"], // or "babel-preset-expo"
    plugins: [
        ["mobx-react-plugin/babel", {}],
        // optional, must come after mobx-react-plugin
        "babel-plugin-react-compiler"
    ]
}
```

Expo enables React Compiler through `babel-preset-expo` (the `experiments.reactCompiler` app config). Plugins listed in `plugins` run before the plugins a preset adds, so the order is right automatically.

Metro caches transformed files: restart with `npx react-native start --reset-cache` (or `npx expo start --clear`) after adding or reconfiguring the plugin.

### webpack, Rspack, Rsbuild

Add the plugin to `babel-loader`'s options (or to `babel.config.js`):

```js
{
    loader: "babel-loader",
    options: {
        presets: ["@babel/preset-react", "@babel/preset-typescript"],
        plugins: [["mobx-react-plugin/babel", {}], "babel-plugin-react-compiler"]
    }
}
```

### Jest

If your tests render components and rely on the automatic wrapping, add the plugin to the Babel configuration `babel-jest` uses (usually the same `babel.config.js`).

## Options

The Babel plugin and the Vite plugin accept the same options. Every feature is enabled by default.

| Option     | Default   | Description                                                                                                                                                                      |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observer` | `true`    | Wrap components in `observer` and mark components and hooks with `"use no memo"`. `false` disables it, an object configures it (see below).                                      |
| `flow`     | `true`    | Turn `async` methods of observable classes and objects into flows. See [Async methods become flows](#async-methods-become-flows).                                                |
| `include`  | all files | Only transform files matching these patterns. Patterns are picomatch globs (matched against the absolute path and the path relative to the project root), RegExps or predicates. |
| `exclude`  | none      | Never transform files matching these patterns. `node_modules` is always skipped.                                                                                                 |

### `observer` options

| Option           | Default             | Description                                                                                                                                        |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importSource`   | `"mobx-react-lite"` | Module that provides `observer`. Use `"mobx-react"` if your app only depends on `mobx-react` (relevant with strict package managers such as pnpm). |
| `useNoMemo`      | `true`              | Insert `"use no memo"` into components so React Compiler leaves them to MobX. The directive is inert when React Compiler is not used.              |
| `useNoMemoHooks` | `true`              | Also insert `"use no memo"` into custom hooks (`useXxx`), see [custom hooks](#custom-hooks). Set to `false` if your hooks never read observables.  |

```ts
mobxReactPlugin({
    observer: { importSource: "mobx-react" },
    flow: false,
    exclude: ["src/design-system/**", /\.stories\.tsx$/]
})
```

### Vite plugin options

| Option          | Default                                    | Description                                                                                       |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `parserPlugins` | `["decorators", "decoratorAutoAccessors"]` | Babel parser plugins enabled in addition to `jsx` and `typescript`, e.g. `["decorators-legacy"]`. |
| `babel`         |                                            | Extra Babel options merged into the transform (advanced).                                         |

The Vite plugin's `include` defaults to `.js`, `.jsx`, `.ts`, `.tsx` (and their `.mjs`/`.cjs`/`.mts`/`.cts` variants).

## What gets transformed

A module-scope function is treated as a component when its name starts with an uppercase letter, it creates JSX (anywhere, including inside `.map` callbacks) or calls hooks, it takes at most two parameters (props and ref) and it does not return an object, class or function. Custom hooks are functions named `useXxx` that call hooks or create JSX, the same rule React Compiler uses.

| Source                                                | Result                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `function Todo() {}` / `export function Todo() {}`    | `const Todo = observer(function Todo() { "use no memo"; ... })`                |
| `export default function Todo() {}`                   | `export default observer(function Todo() { ... })`                             |
| `export default () => ...` in `TodoList.tsx`          | `export default observer(function TodoList() { ... })`                         |
| `const Todo = () => ...`                              | `const Todo = observer(function Todo() { ... })`                               |
| `const Input = forwardRef((props, ref) => ...)`       | `const Input = observer(forwardRef(function Input(props, ref) { ... }))`       |
| `function Input(props, ref) {}` + `forwardRef(Input)` | `Input` keeps its declaration, the call becomes `observer(forwardRef(Input))`  |
| `const Todo = memo(() => ...)`                        | `const Todo = observer(function Todo() { ... })` (`observer` already memoizes) |
| `const Todo = memo(() => ..., areEqual)`              | `const Todo = memo(observer(function Todo() { ... }), areEqual)`               |
| `const Todo = observer(...)` / `observer(Todo)`       | Already observed: only the directive is added                                  |
| `function useTodos() { ... }`                         | Only the directive is added                                                    |

Left alone:

-   functions whose name does not start with an uppercase letter, and functions without JSX or hook calls;
-   class components (use `observer` from `mobx-react`);
-   callbacks passed to unknown higher-order functions, such as `styled(() => ...)` or `connect(...)(Component)`: wrap these manually;
-   components defined inside other functions: wrapping them would create a new component type on every call. They still get the directive if React Compiler would compile them;
-   components that start with `"use memo"`: see [opting out](#opting-out).

Details worth knowing:

-   A function declaration becomes a `const`. Code that referenced the component **before** its declaration at module evaluation time (for example a routes table above the component) now throws a "cannot access before initialization" error instead of relying on hoisting. Move the declaration up.
-   A component that renders itself (tree views) keeps working: the recursive reference is redirected to the observed component.
-   If the file already imports `observer` (from `mobx-react-lite`, `mobx-react` or `importSource`) that import is reused.

## Async methods become flows

Every step of an asynchronous process that changes observables must be an [action](https://mobx.js.org/actions.html#asynchronous-actions). With `async`/`await` that means wrapping the code after each `await` in `runInAction`, or rewriting the method as a generator and using `flow`. The plugin does the rewrite for you:

```ts
class UserStore {
    user = null

    constructor() {
        makeAutoObservable(this)
    }

    async loadUser(id: string) {
        this.user = await api.getUser(id)
    }
}
```

becomes

```ts
class UserStore {
    user = null

    constructor() {
        makeAutoObservable(this)
    }

    *loadUser(id: string) {
        this.user = yield api.getUser(id)
    }
}
```

`makeAutoObservable` infers generator methods as `flow`s, so `loadUser` runs every step inside an action, still returns a promise (with an extra `cancel()` method) and keeps its TypeScript signature in your source.

Only methods MobX will actually turn into flows are converted:

-   `async` methods of classes that call `makeAutoObservable(this)` in their constructor, unless the method is overridden with an annotation other than `flow` or `action` (for example `{ load: false }`);
-   `async` methods annotated with `flow` or `flow.bound` in `makeObservable(this, { ... })`, or decorated with `@flow` / `@flow.bound` (2023-11 decorators);
-   `async` methods annotated with `action` / `action.bound` (`makeObservable(this, { load: action })`, `makeAutoObservable` overrides) or decorated with `@action` / `@action.bound` (2023-11 decorators): `action` only covers the synchronous part of an `async` method, so these become flows and the annotation is rewritten to `flow` / `flow.bound` (importing `flow` from `mobx` when needed);
-   `async` methods of object literals passed to `makeAutoObservable()` or `makeObservable()` (with a `flow` annotation).

Not converted: methods without `await`, methods using `for await`, static and private methods, arrow function properties (a generator would rebind `this`), classes whose MobX call cannot be analyzed statically (for example `makeAutoObservable(this, overrides)` with a variable), legacy decorators, `observable()`, `extendObservable` and `useLocalObservable`. Only the method's own `await`s are replaced; `async` callbacks and existing `runInAction` calls inside it are untouched.

Set `flow: false` to disable this.

## React Compiler

MobX tracks which observables a component reads during render and re-renders it when they change. React Compiler memoizes render output based on statically inferred dependencies and assumes values with a stable identity have not changed. Compiling an `observer` component is therefore unsafe:

```tsx
export const CounterView = observer(() => {
    const count = counterStore.count
    return <div>{count}</div>
})
```

React Compiler caches the JSX of `CounterView`. When `counterStore.count` changes, MobX re-renders the component, but the cached JSX is returned and the DOM stays stale, silently. See [facebook/react#37000](https://github.com/facebook/react/issues/37000) and [mobxjs/mobx#3874](https://github.com/mobxjs/mobx/issues/3874).

The plugin adds React's [`"use no memo"` directive](https://react.dev/reference/react-compiler/directives/use-no-memo) to every observed component, so React Compiler leaves it to MobX. See [MobX and React Compiler](https://mobx.js.org/react-compiler.html) for more background.

### Custom hooks

React Compiler memoizes custom hooks too, so a hook that reads a MobX store goes stale the same way:

```tsx
function useVisibleTodos() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible) // cached by React Compiler, goes stale
}
```

The plugin adds `"use no memo"` to hooks as well.

### Opting out

MobX already memoizes observed components, so in an application where most components are observed, React Compiler has little left to optimize. That is an accepted tradeoff. To hand code that does not read observables back to React Compiler:

-   Exclude a folder or a UI library: `exclude: ["src/ui/**"]` (or restrict the transform with `include`).
-   Start a component or hook with `"use memo"`. The plugin then neither wraps it in `observer` nor adds `"use no memo"`. A `"use memo"` component that is also wrapped in `observer` is a build error.
-   If none of your hooks read observables, pass `observer: { useNoMemoHooks: false }`.

A module-level `"use no memo"` keeps the automatic `observer` but skips the function-level directives, since the compiler skips the whole file anyway.

## Migrating from `mobx-react-observer`

-   `import plugin from "mobx-react-observer/vite-plugin"` becomes `import mobxReactPlugin from "mobx-react-plugin/vite"`.
-   `observer` is imported from `mobx-react-lite` directly instead of from the plugin package; set `importSource` if needed.
-   `importPath` is now `importSource`.
-   `exclude` also accepts RegExps and predicates. `include` is new.

## ESLint

With this plugin the [`mobx/missing-observer`](../eslint-plugin-mobx/README.md) rule of `eslint-plugin-mobx` is no longer needed for the files it transforms.

## Credits

The idea of automatically wrapping components in `observer` at build time comes from [Christian Alfoni](https://github.com/christianalfoni) and his [mobx-react-observer](https://github.com/christianalfoni/mobx-react-observer) package.
