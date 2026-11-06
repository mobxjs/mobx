# mobx-react-plugin

## 1.0.0

### Major Changes

-   [`920f93f2aecc843523f7b598e5f808021b5e2933`](https://github.com/mobxjs/mobx/commit/920f93f2aecc843523f7b598e5f808021b5e2933) [#4735](https://github.com/mobxjs/mobx/pull/4735) Thanks [@kubk](https://github.com/kubk)! - Add `mobx-react-plugin`, which wraps React components in `observer`, adds the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turns `async` methods of observable classes and objects into MobX flows. Each feature can be switched off.
