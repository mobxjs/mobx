---
title: Installation
sidebar_label: Installation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Installation

MobX works in browsers and Node.js environments that provide native `Proxy` support.

React integration is available in two forms:

-   [mobx-react-lite](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react-lite). Utilities to manually apply observation to function components.
-   [mobx-react](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react). Wrapper around `mobx-react-lite` that also supports class components.
-   [mobx-react-observer](https://github.com/christianalfoni/mobx-react-observer). Babel/swc plugin to automatically apply observation to components.

Append the appropriate bindings for your use case to one of the commands below:

**npm:** `npm install mobx`

**pnpm:** `pnpm add mobx`

**yarn:** `yarn add mobx`

**CDN:** https://cdnjs.com/libraries/mobx / https://unpkg.com/mobx/dist/mobx.umd.production.min.js

# Transpilation settings

## MobX and Decorators

Based on your preference, MobX can be used with or without decorators.
See [enabling-decorators](enabling-decorators.md) for more details on how to enable them.

## Use spec compliant transpilation for class properties

When using MobX with TypeScript or Babel, and you plan to use classes; make sure to update your configuration to use a TC-39 spec compliant transpilation for class fields, since this is not always the default. Without this, class fields cannot be made observable before they are initialized.

-   **TypeScript**: Set the compiler option `"useDefineForClassFields": true`.
-   **Babel**: Make sure to use at least version 7.12, with the following configuration:

    ```json
    {
        // Babel < 7.13.0
        "plugins": [["@babel/plugin-proposal-class-properties", { "loose": false }]],

        // Babel >= 7.13.0 (https://babeljs.io/docs/en/assumptions)
        "plugins": [["@babel/plugin-proposal-class-properties"]],
        "assumptions": {
            "setPublicClassFields": false
        }
    }
    ```

For verification insert this piece of code at the beginning of your sources (eg. `index.js`)

<!-- prettier-ignore -->
```javascript
if (!new (class { x })().hasOwnProperty("x")) throw new Error("Transpiler is not configured correctly")
```

## MobX on other frameworks / platforms

-   [MobX.dart](https://mobx.netlify.app/): MobX for Flutter / Dart
-   [lit-mobx](https://github.com/adobe/lit-mobx): MobX for lit-element
-   [mobx-angular](https://github.com/mobxjs/mobx-angular): MobX for angular
-   [mobx-vue](https://github.com/mobxjs/mobx-vue): MobX for Vue
