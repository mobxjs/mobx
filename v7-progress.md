-   don't commit
-   don't delete
    it's just for your context

# MobX 7 Migration Progress

## Objective

-   Remove non-proxy support; MobX 7 only supports Proxy-backed observable objects and arrays.
-   Remove legacy decorator support.
-   Keep Stage 3 decorators on the main `mobx` entry.
-   Remove `trace` and its related runtime/API surface.
-   Track bundle size with `npm -w mobx run check-size`.

## Baseline

-   Bundle CJS prod: 56.70 KiB raw, 17.12 KiB gzip
-   Bundle ESM prod: 56.46 KiB raw, 17.02 KiB gzip
-   Minimal ESM: 48.51 KiB raw, 14.66 KiB gzip
-   makeAutoObservable ESM: 48.83 KiB raw, 14.78 KiB gzip

## Current Result

-   Bundle CJS prod: 48.26 KiB raw, 15.00 KiB gzip
-   Bundle ESM prod: 48.01 KiB raw, 14.90 KiB gzip
-   Minimal ESM: 40.71 KiB raw, 12.63 KiB gzip
-   makeAutoObservable ESM: 41.03 KiB raw, 12.74 KiB gzip

## React Binding Size Delta

Measured publish artifacts from clean `HEAD`, the pre-merge v7 cleanup checkpoint, and the current unified `mobx-react` package state.

| Package      | Artifact |  HEAD raw/gzip | Pre-merge raw/gzip | Unified raw/gzip | Unified vs pre-merge gzip |
| ------------ | -------- | -------------: | -----------------: | ---------------: | ------------------------: |
| `mobx-react` | CJS prod | 10894 / 3871 B |      6056 / 2292 B |    7148 / 2687 B |           +395 B (+17.2%) |
| `mobx-react` | ESM prod |  9896 / 3796 B |      5585 / 2251 B |    6969 / 2661 B |           +410 B (+18.2%) |
| `mobx-react` | UMD prod | 11022 / 3943 B |      6263 / 2383 B |    7290 / 2737 B |           +354 B (+14.9%) |

`npm -w mobx-react run test:size` currently reports zero-byte import sizes in this repo setup, so the table uses raw publish artifacts plus gzip level 9.

## React Binding API Surface

-   Only React bindings package: `mobx-react`.
-   Public exports: `observer`, `Observer`, `useLocalObservable`, `enableStaticRendering`, `isUsingStaticRendering`, `_observerFinalizationRegistry`, `clearTimers`.
-   `observer` is now the unified superset: function components, `forwardRef`, class components, and `@observer` class decorators.
-   Removed public APIs: `Provider`, `inject`, `disposeOnUnmount`, `PropTypes`, `useObserver`, `useLocalStore`, `useAsObservableSource`, `useStaticRendering`, `observerBatching`, `isObserverBatched`.
-   `mobx-react` remains marked `sideEffects: false` and exposes named ESM exports.

## React Binding Merge Rationale

The merge is justified because, after the v7 API cleanup, `mobx-react` no longer carries the old features that made it a meaningfully separate higher-level package. `Provider` / `inject`, `disposeOnUnmount`, `PropTypes`, deprecated hooks, public batching controls, and observable `props` / `state` semantics are gone. What remained was the same function-component observer behavior as `mobx-react-lite`, plus class component support.

Before the merge, `mobx-react` was already structurally close to a wrapper: `src/observer.tsx` detected class components and delegated function components to `mobx-react-lite`'s `observer`; `src/index.ts` re-exported most hook/static-rendering APIs directly from `mobx-react-lite`. That made the package split mostly organizational rather than behavioral.

The merge changes that relationship from dependency to ownership:

-   `mobx-react` removed the `mobx-react-lite` dependency and dev dependency.
-   The lite function observer implementation moved into `mobx-react/src/observerFunction.ts`.
-   Lite's internal render tracking moved into `mobx-react/src/useObserverInternal.ts`.
-   Lite's remaining kept public utilities moved local: `Observer`, `useLocalObservable`, `enableStaticRendering`, and `isUsingStaticRendering`.
-   Lite's support utilities moved local: finalization registry, React batching setup, debug value printing, React Native batched updates, and environment assertions.
-   The separate `mobx-react-lite` workspace was deleted instead of retained as a compatibility package.

This does add roughly 350-410 gzip bytes to the standalone `mobx-react` artifact compared with the pre-merge thin wrapper, because the code previously supplied by the external `mobx-react-lite` package now lives inside `mobx-react`. It is still smaller than the current pre-v7 `mobx-react` artifact and removes the conceptual cost of two React binding packages whose post-cleanup behavior had mostly converged.

## Class Component Support In The Unified Observer

Class support was not added by teaching the old `mobx-react-lite` package about classes. Instead, the lite function-component implementation was copied into `mobx-react`, and the existing `mobx-react` class observer stayed as the class branch.

The unified `observer` is a runtime dispatcher:

-   Function components and already-created `React.forwardRef` components go to `observerFunction`.
-   `React.Component` and `React.PureComponent` subclasses go to `makeClassComponentObserver`.
-   Stage 3 `@observer` class decorator usage is accepted by the same entry point, with a guard that rejects non-class decorator contexts.

The class path still uses the old `mobx-react` mechanics:

-   It marks a class as already observed to prevent double wrapping.
-   It installs `observerSCU` for non-`PureComponent` classes that do not define their own `shouldComponentUpdate`.
-   It replaces the prototype `render` with a per-instance reactive render wrapper.
-   It creates a MobX `Reaction` around `render`; invalidation calls `forceUpdate` after mount, or records a pending invalidation before mount.
-   It registers not-yet-mounted instances with the shared finalization registry so abandoned renders from Suspense, StrictMode, or concurrent rendering can dispose their reactions.
-   It wraps `componentDidMount` and `componentWillUnmount` directly to wire mount state and reaction disposal.

The important class-support changes caused by the merge are mostly rewiring and simplification:

-   `observerClass.ts` now imports `isUsingStaticRendering` and `observerFinalizationRegistry` from local `mobx-react` files instead of from `mobx-react-lite`.
-   The old `patch` utility was removed because `disposeOnUnmount` is gone; `componentWillUnmount` is wrapped directly and then calls the user's original method.
-   The old injector warning in `observer` disappeared because `inject` is no longer part of the package.
-   Class `props`, `state`, and `context` are no longer observable inputs for computed values. In development, descriptors still catch reads from the wrong derivation and explain that these values are non-reactive.

## What Changed From `mobx-react-lite`

The copied lite implementation was deliberately narrowed:

-   Deprecated `observer(fn, { forwardRef: true })` support was removed; callers must pass a `React.forwardRef(...)` component.
-   The public `useObserver` hook was removed; the implementation is now private as `useObserverInternal`.
-   `useLocalStore`, `useAsObservableSource`, and `useStaticRendering` were removed; `useLocalObservable`, `enableStaticRendering`, and `isUsingStaticRendering` remain.
-   The `use-sync-external-store` shim was removed; the implementation calls `React.useSyncExternalStore` directly because `mobx-react` now requires React 18+.
-   Legacy function-component `contextTypes` handling and its warning path were removed.
-   Public batching APIs were removed, but internal batching setup remains for React Native.
-   Error messages were renamed from `[mobx-react-lite]` to `[mobx-react]`.

## Completed

-   Removed source-level non-proxy selection paths and ES5 compatibility fallbacks.
-   Removed the public `trace` API and related runtime support.
-   Restored Stage 3 decorator support to the main `observable`, `computed`, `action`, and `flow` APIs.
-   Removed the separate decorators subpath artifacts and build wiring.
-   Restored normal private-property mangling with no decorator bridge reserved names.
-   Updated decorator tests, perf fixtures, package metadata, and docs to use the main `mobx` entry.
-   Removed deprecated React binding hooks and public batching APIs, while retaining internal React Native batching setup.
-   Removed `Provider` / `inject` and `disposeOnUnmount` from `mobx-react`.
-   Bumped `mobx-react` React peer support to React 18+.
-   Merged the React binding implementation into `mobx-react`.
-   Removed the `mobx-react-lite` workspace/package instead of publishing a warning-only compatibility wrapper.
-   Removed public `PropTypes` support and the root `prop-types` dev dependency.
-   Updated docs to use `mobx-react` as the single manual React binding package.

## Verification

-   `npm -w mobx run test:types` passed.
-   `npm -w mobx-react run test:types` passed.
-   `npm -w mobx-react test -- --runInBand` passed: 9 suites, 64 tests, 1 skipped, 9 snapshots.
-   `npm -w mobx-undecorate test -- --runInBand` passed: 2 suites, 49 tests, 50 snapshots.
-   `npm -w mobx exec -- jest --config jest.config-decorators.js --runTestsByPath __tests__/decorators_20223/stage3-decorators.ts __tests__/decorators_20223/stage3-decorators-inheritance.ts` passed.
-   `npm -w mobx test` passed: 32 suites, 751 tests, 9 skipped.
-   `npm test -- --runInBand` passed: 53 suites, 1163 tests, 10 skipped, 91 snapshots.
-   `npm -w mobx run check-size` passed with the current result above.
-   `npm -w mobx-react run build -- --target publish` passed.
-   `npm install --package-lock-only --ignore-scripts` passed.
-   `cd packages/mobx && npm pack --dry-run --json` passed; no root decorators wrapper and no separate decorators entry artifacts are included.
-   A built CJS smoke test verified decorators imported from `mobx` work for `@observable accessor`, `@computed`, `@action`, `autorun`, `isObservableProp`, `isComputedProp`, and `isAction`.
-   `git diff --check` passed.

## Future Follow-Up

-   A separate upgrade/codemod package can rewrite imports from the removed React binding package to `mobx-react`.
