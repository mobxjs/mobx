# MobX + React Compiler demo

A small Vite application that shows MobX and React Compiler (its default configuration) coexisting, thanks to `mobx-react-plugin`.

```text
React component source
    -> mobx-react-plugin:     automatic observer + "use no memo"   (Vite pre-transform)
    -> @vitejs/plugin-react                                       (React, Fast Refresh)
    -> React Compiler via @rolldown/plugin-babel                  (babel-plugin-react-compiler, default options)
    -> Vite build
```

## Run it

The plugin is consumed from the monorepo (`"mobx-react-plugin": "file:../.."`), so build it first:

```sh
# in packages/mobx-react-plugin
npm run build
# in this directory
npm install
npm run dev        # development server
npm run build && npm run preview   # production build
npm test           # static per-file proof (dev + production) and the runtime proof
```

Click **Mutate store**: the protected components update (`count`, `name`, `todos`), the intentionally unsafe control keeps showing `0`, and the pure component (compiled by React Compiler) counts the clicks.

## Transform policy

Configured in [vite.config.ts](./vite.config.ts) with `mobxReactPlugin({ include: ["src/protected/**"] })`:

| Directory          | Treatment                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/protected/**` | Automatically wrapped in `observer` and marked `"use no memo"`. React Compiler leaves these to MobX.                  |
| `src/controls/**`  | Excluded on purpose. `observer(CounterView)` with a separately declared component: compiled by React Compiler, stale. |
| `src/pure/**`      | Excluded: a regular React component, compiled and memoized by React Compiler normally.                                |
| `src/App.tsx`      | Outside the policy: regular React code (state, event handler), compiled by React Compiler.                            |

## What the tests prove

[tests/transform.spec.ts](./tests/transform.spec.ts) captures the final output of every file from the complete Vite pipeline, both through the development server and through a production build, and asserts:

```text
Protected automatic observer:
  observer wrapper present
  "use no memo" present
  no compiler memo cache (`_c(n)`) in the component

Unsafe manual observer control:
  compiler memo cache present

Pure React component:
  compiler memo cache present, no observer
```

[tests/runtime.spec.tsx](./tests/runtime.spec.tsx) renders the app (under `<StrictMode>`, through the same Vite plugin pipeline) and clicks **Mutate store** three times:

```text
protected count: 0 -> 3
protected name:  A! -> B!
protected todos: A -> A, B, B, B
control count:   0 -> 0   (intentionally stale, facebook/react#37000)
pure clicks:     0 -> 3
no React errors
```

## Known limitation: custom hooks

A function-level `"use no memo"` protects that function only. A separately defined hook that reads observables would be compiled on its own and cache derived values against the stable identity of the store. `mobx-react-plugin` therefore also adds the directive to custom hooks in the files it transforms (`observer.useNoMemoHooks`, enabled by default). Hooks in excluded files must opt out themselves.
