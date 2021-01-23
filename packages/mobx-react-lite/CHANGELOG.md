# mobx-react-lite

## 3.1.7

### Patch Changes

-   [`592e6e99`](https://github.com/mobxjs/mobx/commit/592e6e996c2d5264e162cfb0921a071c1d815c92) [#2743](https://github.com/mobxjs/mobx/pull/2743) Thanks [@vkrol](https://github.com/vkrol)! - Remove `sideEffects` section in `mobx-react-lite` `package.json`

-   Updated dependencies [[`6b304232`](https://github.com/mobxjs/mobx/commit/6b30423266e5418a3f20389d0bd0eae31f3384d2), [`83b84fd3`](https://github.com/mobxjs/mobx/commit/83b84fd354f2253fdd8ea556e217a92fc2633c00), [`65c7b73b`](https://github.com/mobxjs/mobx/commit/65c7b73b7f0b1a69a1a2786b5f484419d129d10b), [`989390d4`](https://github.com/mobxjs/mobx/commit/989390d46bbe9941b61ac6c6d1292f96445e7cc3), [`dea1cf18`](https://github.com/mobxjs/mobx/commit/dea1cf189b0f43929f4f626229d34a80bd10212e), [`592e6e99`](https://github.com/mobxjs/mobx/commit/592e6e996c2d5264e162cfb0921a071c1d815c92)]:
    -   mobx@6.0.5

## 3.1.6

### Patch Changes

-   [`2f3dcb27`](https://github.com/mobxjs/mobx/commit/2f3dcb274f795ffca4ae724b6b4795958620838d) Thanks [@FredyC](https://github.com/FredyC)! - Fix names of UMD exports [#2517](https://github.com/mobxjs/mobx/issues/2617)

-   Updated dependencies [[`79a09f49`](https://github.com/mobxjs/mobx/commit/79a09f49a9f2baddbab8d89e9a7ac07cffadf624)]:
    -   mobx@6.0.4

## 3.1.5

### Patch Changes

-   [`01a050f7`](https://github.com/mobxjs/mobx/commit/01a050f7603183e6833b7fd948adb4fbe1437f5a) Thanks [@FredyC](https://github.com/FredyC)! - Fix use of react-dom vs react-native

    The `es` folder content is compiled only without transpilation to keep `utils/reactBatchedUpdates` which exists in DOM and RN versions. The bundled `esm` is still kept around too, especially the prod/dev ones that should be utilized in modern browser environments.

## 3.1.4

### Patch Changes

-   [`8bbbc7c0`](https://github.com/mobxjs/mobx/commit/8bbbc7c0df77cd79530add5db2d6a04cfe6d84b1) Thanks [@FredyC](https://github.com/FredyC)! - Fix names of dist files (for real now). Third time is the charm 😅

## 3.1.3

### Patch Changes

-   [`b7aa9d35`](https://github.com/mobxjs/mobx/commit/b7aa9d35432888ee5dd80a6c9dcbc18b04a0346c) Thanks [@FredyC](https://github.com/FredyC)! - Fixed wrong package name for dist files

## 3.1.2

### Patch Changes

-   [`5239db80`](https://github.com/mobxjs/mobx/commit/5239db80cf000026906c28a035725933d4dd6823) Thanks [@FredyC](https://github.com/FredyC)! - Fixed release with missing dist files

## 3.1.1

### Patch Changes

-   [`81a2f865`](https://github.com/mobxjs/mobx/commit/81a2f8654d9656e2e831176e45cbf926fbc364e0) Thanks [@FredyC](https://github.com/FredyC)! - ESM bundles without NODE_ENV present are available in dist folder. This useful for consumption in browser environment that supports ESM Choose either `esm.production.min.js` or `esm.development.js` from `dist` folder.

## 3.1.0

### Minor Changes

-   [`a0e5fea`](https://github.com/mobxjs/mobx-react-lite/commit/a0e5feaeede68b0bac035f60bf2a7edff3fa1269) [#329](https://github.com/mobxjs/mobx-react-lite/pull/329) Thanks [@RoystonS](https://github.com/RoystonS)! - expose `clearTimers` function to tidy up background timers, allowing test frameworks such as Jest to exit immediately

### Patch Changes

-   [`fafb136`](https://github.com/mobxjs/mobx-react-lite/commit/fafb136cce2847b83174cbd15af803442a9a0023) [#332](https://github.com/mobxjs/mobx-react-lite/pull/332) Thanks [@Bnaya](https://github.com/Bnaya)! - Introduce alternative way for managing cleanup of reactions.
    This is internal change and shouldn't affect functionality of the library.

## 3.0.1

### Patch Changes

-   [`570e8d5`](https://github.com/mobxjs/mobx-react-lite/commit/570e8d594bac415cf9a6c6771080fec043161d0b) [#328](https://github.com/mobxjs/mobx-react-lite/pull/328) Thanks [@mweststrate](https://github.com/mweststrate)! - If observable data changed between mount and useEffect, the render reaction would incorrectly be disposed causing incorrect suspension of upstream computed values

*   [`1d6f0a8`](https://github.com/mobxjs/mobx-react-lite/commit/1d6f0a8dd0ff34d7e7cc71946ed670c31193572d) [#326](https://github.com/mobxjs/mobx-react-lite/pull/326) Thanks [@FredyC](https://github.com/FredyC)! - No important changes, just checking new setup for releases.

> Prior 3.0.0 see GitHub releases for changelog
