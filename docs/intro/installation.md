---
title: Installation
sidebar_label: Installation
hide_title: true
---

# Installation

MobX works in any ES5 environment, which includes browsers and NodeJS:

-   Yarn: `yarn add immer`. React bindings: `yarn add mobx-react`

-   NPM: `npm install mobx --save`. React bindings: `npm install mobx-react --save`.

-   CDN:
    -   cndjs: https://cdnjs.com/libraries/mobx
    -   Unpkg: `<script src="https://unpkg.com/mobx/lib/mobx.umd.js"></script>
    -   ⚠️ When using a CDN, it is best to check the url in your browser and see what version it resolves to, so that your users aren't accidentally served a newer version in the future when updates are release. So use an url like: https://unpkg.com/mobx@5.15.4/lib/mobx.umd.production.min.js instead. Substitute `production.min` with `development` in the URL for a development build.

## MobX on older JavaScript environments?

By default MobX uses proxies for optimal performance and compatibility. However, on older JavaScript engines `Proxy` is not available (see [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy)). For example, when running Microsoft Internet Explorer or React Native (if < v0.59 or when using the Hermes engine) on Android. In such cases, MobX can fallback to an ES5 compatible implementation which works almost identically, though there are a few [limitations without Proxy support](../best/limitations-without-proxies.md).

You have to explicitly enable the fallback implementation by calling `enableES5()`:

```javascript
import { enableES5 } from "mobx"

enableES5()
```

## MobX on modern JavaScript environments?

The main entry point of the MobX 6 package ships with ES5 code for backward compatibility -- it
works in any ES5 environment. But if you only intend to run MobX 6 in modern environments, consider using consider using the faster and smaller ES6 build: `lib/mobx.es6.js`. For example by setting up a webpack alias: `resolve: { alias: { mobx: __dirname + "/node_modules/mobx/lib/mobx.es6.js" }}`
