---
"eslint-plugin-mobx": major
---

Support only ESLint 9 and 10, with flat config only. The `eslint` peer dependency is now `^9.0.0 || ^10.0.0`. `configs.recommended` is now the flat config, and the eslintrc config and `flatConfigs` are removed: replace `pluginMobx.flatConfigs.recommended` with `pluginMobx.configs.recommended`. Projects on ESLint 8 or older, or on eslintrc, should stay on `eslint-plugin-mobx` 0.2.x.
