# mobx-react-plugin

## 1.0.3

### Patch Changes

-   [`efbff0be0157cd8b962e88ba04109aedc11b73d9`](https://github.com/mobxjs/mobx/commit/efbff0be0157cd8b962e88ba04109aedc11b73d9) [#4776](https://github.com/mobxjs/mobx/pull/4776) Thanks [@kubk](https://github.com/kubk)! - Remove dead code and stop exporting internal helpers that nothing outside their own module uses

## 1.0.2

### Patch Changes

-   [`b433c95720ced6f987d2379913933d49517cb48f`](https://github.com/mobxjs/mobx/commit/b433c95720ced6f987d2379913933d49517cb48f) [#4770](https://github.com/mobxjs/mobx/pull/4770) Thanks [@kubk](https://github.com/kubk)! - Faster transforms: files that cannot contain components, hooks or flows are skipped without being parsed, and the Vite plugin only generates code when something changed. Code generation options for the Vite plugin now go in `babel.generatorOpts`.

## 1.0.1

### Patch Changes

-   [`99ff7cefd3fa1bc7724705b89ebcf3bfcc0a0821`](https://github.com/mobxjs/mobx/commit/99ff7cefd3fa1bc7724705b89ebcf3bfcc0a0821) [#4767](https://github.com/mobxjs/mobx/pull/4767) Thanks [@kubk](https://github.com/kubk)! - Vite plugin: fix "Invalid hook call" and a page reload on the first dev-server start. Vite's dependency scanner does not see the `observer` import the plugin adds to components, so it discovered `mobx-react-lite` late and re-optimized while the page was loading. The plugin now adds `mobx-react-lite` to `optimizeDeps.include`.

## 1.0.0

### Major Changes

-   [`920f93f2aecc843523f7b598e5f808021b5e2933`](https://github.com/mobxjs/mobx/commit/920f93f2aecc843523f7b598e5f808021b5e2933) [#4735](https://github.com/mobxjs/mobx/pull/4735) Thanks [@kubk](https://github.com/kubk)! - Add `mobx-react-plugin`, which wraps React components in `observer`, adds the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turns `async` methods of observable classes and objects into MobX flows. Each feature can be switched off.
