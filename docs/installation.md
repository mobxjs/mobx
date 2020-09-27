---
title: Installation
sidebar_label: Installation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Installation

MobX works in any ES5 environment, which includes browsers and NodeJS.

There are two types of React bindings, `mobx-react-lite` supports only functional components, whereas `mobx-react` also supports class based components. Append the appropriate bindings for your use case to the *Yarn* or *NPM* command below.

**Yarn:** `yarn add mobx`

**NPM:** `npm install --save mobx`

**CDN:** https://cdnjs.com/libraries/mobx / https://unpkg.com/mobx/lib/mobx.umd.js

_⚠️ **Warning:** When using a CDN, it is best to check the url in your browser and see what version it resolves to, so that your users aren't accidentally served a newer version in the future when updates are released. Use an url like: https://unpkg.com/mobx@5.15.4/lib/mobx.umd.production.min.js instead. For a development build, substitute `production.min` with `development` in the URL. ⚠️_

## MobX on older JavaScript environments

By default, MobX uses proxies for optimal performance and compatibility. However, on older JavaScript engines `Proxy` is not available (check out [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy)). Examples of such are Internet Explorer (before Edge), Node.js < 6, iOS < 10, Android before RN 0.59, or Android on iOS.

In such cases, MobX can fallback to an ES5 compatible implementation which works almost identically, although there are a few [limitations without Proxy support](../refguide/configure.md#limitations-without-proxy-support). You will have to explicitly enable the fallback implementation by configuring [`useProxies`](../refguide/configure#useproxies):

```javascript
import { configure } from "mobx"

configure({ useProxies: "never" }) // Or "ifavailable".
```

## MobX and Decorators

If you have used MobX before, or if you followed online tutorials, you probably saw MobX with decorators like `@observable`.
In MobX 6, we have chosen to move away from decorators by default, for maximum compatibility with standard JavaScript.
They can still be used if you [enable them](../best/decorators.md) though.

## MobX on other frameworks / platforms

-   [MobX.dart](https://mobx.netlify.app/): MobX for Flutter / Dart
-   [lit-mobx](https://github.com/adobe/lit-mobx): MobX for lit-element
-   [mobx-angular](https://github.com/mobxjs/mobx-angular): MobX for angular
-   [mobx-vue](https://github.com/mobxjs/mobx-vue): MobX for Vue
