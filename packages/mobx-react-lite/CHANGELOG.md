# mobx-react-lite

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
