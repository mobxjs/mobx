---
"eslint-plugin-mobx": major
---

Support only ESLint 9.10+ and 10, with flat config only. The `eslint` peer dependency is now `^9.10.0 || ^10.0.0`, and `@types/eslint` is no longer a dependency, since ESLint ships its own types. `configs.recommended` is now the flat config, and the eslintrc config and `flatConfigs` are removed: replace `pluginMobx.flatConfigs.recommended` with `pluginMobx.configs.recommended`. The `missing-observer` rule is removed: wrap components in `observer` yourself, or use `mobx-react-plugin` to wrap them all at build time. The deprecated `no-anonymous-observer` rule is removed too; use `react/display-name` with `componentWrapperFunctions: ["observer"]` instead. Projects on ESLint 8 or older, or on eslintrc, should stay on `eslint-plugin-mobx` 0.2.x.
