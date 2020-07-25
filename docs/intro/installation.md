---
title: Installation
sidebar_label: Installation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Installation

MobX works in any ES5 environment, which includes browsers and NodeJS:

-   Yarn: `yarn add mobx`. React bindings: `yarn add mobx-react`

-   NPM: `npm install mobx --save`. React bindings: `npm install mobx-react --save`.

-   CDN:
    -   cndjs: https://cdnjs.com/libraries/mobx
    -   unpkg: https://unpkg.com/mobx/lib/mobx.umd.js
    -   ⚠️ When using a CDN, it is best to check the url in your browser and see what version it resolves to, so that your users aren't accidentally served a newer version in the future when updates are release. So use an url like: https://unpkg.com/mobx@5.15.4/lib/mobx.umd.production.min.js instead. Substitute `production.min` with `development` in the URL for a development build.

## MobX on older JavaScript environments

By default MobX uses proxies for optimal performance and compatibility. However, on older JavaScript engines `Proxy` is not available (see [Proxy support](https://kangax.github.io/compat-table/es6/#test-Proxy)). Examples are Internet Explorer (before Edge), Node.js < 6, iOS < 10, Android before RN 0.59, or Android on iOS. In such cases, MobX can fallback to an ES5 compatible implementation which works almost identically, though there are a few [limitations without Proxy support](../refguide/configure.md#limitations-without-proxy-support).

You will have to explicitly enable the fallback implementation by configuring [`useProxies`](../refguide/configure#useproxies):

```javascript
import { configure } from "mobx"

configure({ useProxies: "never" }) // or "ifavailable"
```

## MobX and Decorators

If you have used MobX before, or if you followed online tutorials, you probably saw MobX with decorators like `@observable`.
In MobX 6 we have chosen to move away by default from decorators for maximum compatibility with standard JavaScript.
They can still be used though if you [enable decorators](../best/decorators.md).
