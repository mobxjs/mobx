---
title: Installation
sidebar_label: Installation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Installation

MobX works in any ES5 environment, which includes browsers and NodeJS.

There are two types of React bindings, `mobx-react-lite` supports only functional components, whereas `mobx-react` also supports class based components. Append the appropriate bindings for your use case to the _Yarn_ or _NPM_ command below:

**Yarn:** `yarn add mobx`

**NPM:** `npm install --save mobx`

**CDN:** https://cdnjs.com/libraries/mobx / https://unpkg.com/mobx/dist/mobx.umd.production.min.js

# Transpilation settings

## MobX and Decorators

Based on your preference, MobX can be used with or without decorators.
Both the legacy implementation and the standardised TC-39 version of decorators are currently supported.
See [enabling-decorators](enabling-decorators.md) for more details on how to enable them.
Legacy decorator support will be removed in MobX 7, in favor of the standard.

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
if (!new class { x }().hasOwnProperty('x')) throw new Error('Transpiler is not configured correctly');
```

Note that for Next.js you must [customize Babel](https://nextjs.org/docs/advanced-features/customizing-babel-config) instead of TypeScript, even if your project is set up to use TypeScript. 

## MobX on older JavaScript environments

By default, MobX uses proxies for optimal performance and compatibility. However, on older JavaScript engines `Proxy` is not available (check out [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy)). Examples of such are Internet Explorer (before Edge), Node.js < 6, iOS < 10, Android before RN 0.59, or Android on iOS.

In such cases, MobX can fallback to an ES5 compatible implementation which works almost identically, although there are a few [limitations without Proxy support](configuration.md#limitations-without-proxy-support). You will have to explicitly enable the fallback implementation by configuring [`useProxies`](configuration.md#proxy-support):

```javascript
import { configure } from "mobx"

configure({ useProxies: "never" }) // Or "ifavailable".
```

This option will be removed in MobX 7.

## MobX on other frameworks / platforms

-   [MobX.dart](https://mobx.netlify.app/): MobX for Flutter / Dart
-   [lit-mobx](https://github.com/adobe/lit-mobx): MobX for lit-element
-   [mobx-angular](https://github.com/mobxjs/mobx-angular): MobX for angular
-   [mobx-vue](https://github.com/mobxjs/mobx-vue): MobX for Vue
