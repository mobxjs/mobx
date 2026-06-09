---
title: Installation
sidebar_label: Installation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Installation

MobX works in modern JavaScript environments with native `Proxy` support, including current browsers and Node.js versions.
Published MobX 7 bundles target browsers with native ES module support.

React integration is available in two forms:

-   [mobx-react](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react). Utilities to manually apply observation to function and class components.
-   [mobx-react-observer](https://github.com/christianalfoni/mobx-react-observer). Babel/swc plugin to automatically apply observation to components.

Append the appropriate bindings for your use case to the _Yarn_ or _NPM_ command below:

**Yarn:** `yarn add mobx mobx-react`

**NPM:** `npm install --save mobx mobx-react`

**CDN:** https://cdnjs.com/libraries/mobx / https://unpkg.com/mobx/dist/mobx.umd.production.min.js

# Transpilation settings

## MobX and Decorators

Based on your preference, MobX can be used with or without decorators.
Only the standardized TC-39 decorators are supported.
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

```javascript
if (
    !new (class {
        x
    })().hasOwnProperty("x")
)
    throw new Error("Transpiler is not configured correctly")
```

## MobX on older JavaScript environments

MobX requires native [`Proxy` support](https://compat-table.github.io/compat-table/es6/#test-Proxy) for observable arrays and plain objects.
Older JavaScript engines without Proxy support, such as Internet Explorer, Node.js < 6, iOS < 10, and Android before RN 0.59, are not supported by MobX 7.

## MobX on other frameworks / platforms

-   [MobX.dart](https://mobx.netlify.app/): MobX for Flutter / Dart
-   [lit-mobx](https://github.com/adobe/lit-mobx): MobX for lit-element
-   [mobx-angular](https://github.com/mobxjs/mobx-angular): MobX for angular
-   [mobx-vue](https://github.com/mobxjs/mobx-vue): MobX for Vue
