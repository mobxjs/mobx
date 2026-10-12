# mobx-react-plugin

The MobX plugin for React projects: a Babel plugin that works with every bundler that runs Babel (Vite, webpack, Rspack, Metro / React Native, Expo, Next.js, Jest) plus a ready-made Vite plugin.

It does three things, each of which can be switched off:

1. wraps every React component in your source files in [`observer`](https://mobx.js.org/react-integration.html), so you can never forget it;
2. inserts the `"use no memo"` directive into components and hooks, so [React Compiler](https://react.dev/learn/react-compiler) leaves memoization and invalidation of observed components to MobX instead of caching their output;
3. turns `async` methods of observable classes and objects into MobX [flows](https://mobx.js.org/actions.html#using-flow-instead-of-async--await-), so state changes after `await` are actions without `runInAction` boilerplate.

**Before**

```tsx
import { observer } from "mobx-react-lite"

export const TodoList = observer(function TodoList() {
    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
})
```

**After**

```tsx
export function TodoList() {
    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
}
```

The plugin turns the second form into the first one at build time:

```tsx
import { observer } from "mobx-react-lite"

export const TodoList = observer(function TodoList() {
    "use no memo"

    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
})
```

Benefits:

-   No more "I forgot `observer`" bugs, the most common MobX + React mistake.
-   Components keep their names in React DevTools (arrow functions are turned into named function expressions).
-   Plain `function Component() {}` declarations: one definition per component, so "go to definition" in your editor keeps working.
-   MobX and React Compiler coexist: see [React Compiler](#react-compiler) below.
-   `async`/`await` in stores just works under `enforceActions`: see [Async methods become flows](#async-methods-become-flows).

This package continues the work of [Christian Alfoni](https://github.com/christianalfoni) on [observing-components](https://github.com/christianalfoni/observing-components) and [mobx-react-plugin](https://github.com/christianalfoni/mobx-react-observer).

## Installation

```sh
npm install --save-dev mobx-react-plugin
```

The generated code imports `observer` from `mobx-react-lite` (configurable through [`importSource`](#options)), so `mobx-react-lite` (or `mobx-react`) must be a dependency of your app.

## Setup

The plugin only needs to run **before React Compiler**, when the compiler is used. It does all its work in Babel's `Program:enter`, before any other plugin sees the file, so listing it first in the Babel `plugins` array is enough. The Vite plugin is a pre-transform (`enforce: "pre"`) and runs before any other Vite plugin.

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

This works with `@vitejs/plugin-react`, `@vitejs/plugin-react-swc` and `@vitejs/plugin-react-oxc`, with or without React Compiler, because the transform runs before the React plugin.

With React Compiler through `@vitejs/plugin-react` 6 and `@rolldown/plugin-babel`:

```ts
import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import mobxReactPlugin from "mobx-react-plugin/vite"

export default defineConfig({
    plugins: [mobxReactPlugin(), react(), babel({ presets: [reactCompilerPreset()] })]
})
```

With `@vitejs/plugin-react` 5 and earlier you can also add the Babel plugin to the plugin's Babel options instead; keep it before the compiler:

```ts
react({
    babel: {
        plugins: [["mobx-react-plugin/babel", {}], "babel-plugin-react-compiler"]
    }
})
```

The Vite plugin parses your files itself. It enables `jsx`, `typescript` (for `.ts`/`.tsx`), `decorators` and `decoratorAutoAccessors`. If you use other syntax, pass [`parserPlugins`](#vite-plugin-options), for example `parserPlugins: ["decorators-legacy"]`.

### React Native and Expo

Metro uses Babel, so the plugin goes into `babel.config.js`:

```js
// babel.config.js
module.exports = {
    presets: ["module:@react-native/babel-preset"], // or "babel-preset-expo"
    plugins: [
        ["mobx-react-plugin/babel", {}],
        // Optional. React Compiler must be listed after mobx-react-plugin.
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

### Next.js

Next.js only runs Babel plugins when the project has its own Babel configuration (which replaces SWC):

```json
// .babelrc
{
    "presets": ["next/babel"],
    "plugins": [["mobx-react-plugin/babel", { "clientOnly": true }]]
}
```

With the app router, `clientOnly: true` limits the transform to modules that start with `"use client"`. Server components cannot be wrapped in `observer`.

### Jest

If your tests render components and rely on the automatic wrapping, add the plugin to the Babel configuration `babel-jest` uses (usually the same `babel.config.js`).

## Options

The Babel plugin and the Vite plugin accept the same options. Every feature is enabled by default; pick the ones you want:

```ts
// just the automatic observer (and the React Compiler directive)
mobxReactPlugin({ flow: false })
// observer + async methods as flows (the default)
mobxReactPlugin({ observer: true, flow: true })
// configure a feature
mobxReactPlugin({ observer: { importSource: "mobx-react", useNoMemoHooks: false }, flow: true })
```

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
| `importName`     | `"observer"`        | Name of the export to import from `importSource`.                                                                                                  |
| `useNoMemo`      | `true`              | Insert `"use no memo"` into components so React Compiler leaves them to MobX. The directive is inert when React Compiler is not used.              |
| `useNoMemoHooks` | `true`              | Also insert `"use no memo"` into custom hooks (`useXxx`), see [custom hooks](#custom-hooks). Set to `false` if your hooks never read observables.  |
| `clientOnly`     | `false`             | Only transform modules that start with `"use client"` (React Server Components).                                                                   |

```ts
mobxReactPlugin({
    observer: { importSource: "mobx-react" },
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

### Opting out

-   Exclude files with `exclude` (or restrict the transform with `include`).
-   Start a component with `"use memo"` to say that React Compiler owns it: it is not wrapped in `observer` and gets no `"use no memo"`. Such a component must not read observables. A `"use memo"` component that is also wrapped in `observer` is a build error.
-   A module-level `"use no memo"` keeps the automatic `observer`, but no function-level directives are inserted since the compiler skips the whole file anyway.

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

`makeAutoObservable` infers generator methods as `flow`s, so `loadUser` runs every step inside an action, still returns a promise (with an extra `cancel()` method) and keeps its TypeScript signature in your source. You write ordinary `async`/`await`, type-check it as such, and get flows at runtime.

Only methods MobX will actually turn into flows are converted:

-   `async` methods of classes that call `makeAutoObservable(this)` in their constructor, unless the method is overridden with another annotation (`{ load: false }`, `{ load: action }`);
-   `async` methods annotated with `flow` or `flow.bound` in `makeObservable(this, { ... })`, or decorated with `@flow` / `@flow.bound`;
-   `async` methods annotated with `action` / `action.bound` (`makeObservable(this, { load: action })`, `makeAutoObservable` overrides) or decorated with `@action` / `@action.bound`: `action` only covers the synchronous part of an `async` method, so these become flows and the annotation is rewritten to `flow` / `flow.bound` (importing `flow` from `mobx` when needed);
-   `async` methods of object literals passed to `observable()`, `observable.object()`, `makeAutoObservable()`, `makeObservable()` (with a `flow` annotation), `extendObservable()` or returned from `useLocalObservable(() => ({ ... }))`.

Not converted: methods without `await`, methods using `for await`, static and private methods, arrow function properties (a generator would rebind `this`), and classes whose MobX call cannot be analyzed statically (for example `makeAutoObservable(this, overrides)` with a variable). Only the method's own `await`s are replaced; `async` callbacks inside it are untouched.

This works with `makeAutoObservable`, `makeObservable`, `observable()` objects, legacy decorators (with `makeObservable(this)`) and modern 2023-11 decorators. Existing `runInAction` calls inside a converted method are left alone: a nested action is harmless, and removing them is a source cleanup (a codemod), not a build-time concern. `async` callbacks inside the method (for example in `.then()` or `setTimeout`) still need their own action.

Set `flow: false` to disable this.

## React Compiler

MobX and React Compiler are both render optimizers, built on incompatible models. MobX tracks which observable objects a component reads during render and re-renders it when they change; the objects keep their identity and their contents change. React Compiler memoizes render expressions based on statically inferred dependencies and assumes values with a stable identity have not changed. Compiling an `observer` component is therefore unsafe:

```tsx
function CounterView() {
    const count = counterStore.count
    return <div>{count}</div>
}

export default observer(CounterView)
```

React Compiler caches the JSX of `CounterView`. When `counterStore.count` changes, MobX correctly re-renders the component, but the cached JSX is returned and the DOM stays stale, silently. See [facebook/react#37000](https://github.com/facebook/react/issues/37000) and [mobxjs/mobx#3874](https://github.com/mobxjs/mobx/issues/3874).

React provides the [`"use no memo"` directive](https://react.dev/reference/react-compiler/directives/use-no-memo) to exclude a function from compilation. This plugin inserts it into every observed component (and every custom hook), which makes the division of responsibilities explicit:

-   MobX owns memoization and invalidation inside observed components. That is what `observer` does: it tracks the exact observables read during render, re-renders when they change and applies `React.memo`.
-   React Compiler optimizes everything else: components you exclude from the transform, hooks and components with `"use memo"`.

Components written as `observer(function View() {})` are currently skipped by the compiler's inference as a side effect of how unknown higher-order-function callbacks are treated, not because the compiler knows MobX. The explicit directive makes the behavior independent of that heuristic.

The precise claim is: **enabling React Compiler does not break MobX rendering, because observed components are explicitly left to MobX.** React Compiler does not optimize the inside of observer components; MobX already does that. Automatic observation can leave relatively little application code for React Compiler to optimize, which is an accepted tradeoff.

React's documentation says the compiler must run first in the Babel pipeline. That rule exists so the compiler sees original source rather than transpiled output. This plugin only wraps components and adds the directive and leaves the code the compiler compiles untouched, so it must run before the compiler.

### Custom hooks

A function-level directive only protects that function. A hook that reads observables and is compiled separately would cache derived values against the stable identity of the store:

```tsx
function useVisibleTodos() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible) // cached by React Compiler, goes stale
}
```

Therefore the plugin also inserts `"use no memo"` into custom hooks by default (`useNoMemoHooks`). Turn it off only if your hooks never read observables.

### Verifying your setup

Inspect the transformed output of one file (for example through the "Sources" panel in dev tools, or Metro's `--verbose` output). An observed component must contain `"use no memo"` and must not contain the compiler's `_c(...)` memo cache. The test suite of this package contains the same checks, including a negative test that shows what happens when the plugin runs after the compiler.

## Why a Babel plugin

Babel is the one transform pipeline every React toolchain can run: Metro (React Native, Expo) and Jest are Babel-only, webpack and Rspack use `babel-loader`, Next.js switches to Babel when a Babel config is present, and React Compiler itself ships as a Babel plugin, so projects that enable it already run Babel. The Vite plugin runs the same transform as a pre-transform, so SWC- and oxc-based React plugins work as well. The transform is small (three AST rewrites) and keeps the original code otherwise intact; a Rust port (`swc-plugin-mobx`, or oxc once it supports third-party transforms) would expose the same options.

## Migrating from `mobx-react-observer` 2.x

-   `import plugin from "mobx-react-plugin/vite-plugin"` becomes `import mobxReactPlugin from "mobx-react-plugin/vite"`.
-   `observer` is now imported from `mobx-react-lite` directly instead of from the plugin package; set `importSource` if needed. The runtime re-export is gone.
-   `exclude` works the same way and now also accepts RegExps and predicates. `include` is new.
-   `importPath` is now `importSource`.
-   Arrow function components are turned into named function expressions so they keep their name in React DevTools.
-   `forwardRef` components are wrapped correctly (`observer(forwardRef(...))`), `memo` is replaced by `observer`, and components that are passed to `observer(...)` elsewhere in the file are no longer wrapped twice.
-   The Babel plugin is available for every bundler through `mobx-react-plugin/babel`.
-   New: `async` methods of observable classes become flows (`flow` option).

## ESLint

With this plugin the [`mobx/missing-observer`](../eslint-plugin-mobx/README.md) rule of `eslint-plugin-mobx` is no longer needed for the files it transforms.

## Credits

The automatic observer transform was created by [Christian Alfoni](https://github.com/christianalfoni) in [observing-components](https://github.com/christianalfoni/observing-components) and packaged for MobX as [mobx-react-plugin](https://github.com/christianalfoni/mobx-react-observer). This package carries that idea forward as an official MobX package.
