---
"mobx": patch
---

-   fix: user provided debug names are not preserved on production
-   fix: property atom's debug name is dynamic on production
-   fix: `observable(primitive, options)` ignores `options`
-   fix: `getDebugName(action)` throws `[MobX] Cannot obtain atom from undefined`
-   [fix: terser using `unsafe: true`](https://github.com/mobxjs/mobx/issues/2751#issuecomment-778171773)
