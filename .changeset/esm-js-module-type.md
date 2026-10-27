---
"mobx": patch
"mobx-react-lite": patch
"mobx-react": patch
---

Remove `"type": "commonjs"` from the package manifests. The `react-native` and `module` entries point at the ESM `dist/*.esm.js` builds, and the field made bundlers that honour it, such as webpack, Rspack and Re.Pack, parse those files as CommonJS and fail on their `import`/`export` statements.
