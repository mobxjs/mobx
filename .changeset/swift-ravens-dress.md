---
"mobx-react": minor
"mobx-react-lite": minor
---

Added experimental / poor man's support for React 18. Fixes #3363, #2526. Supersedes #3005

-   Updated tests, test / build infra, peerDependencies to React 18
-   **[breaking icmw upgrading to React 18]** Already deprecated hooks like `useMutableSource` will trigger warnings in React 18, which is correct and those shouldn't be used anymore.
-   **[breaking icmw upgrading to React 18]** When using React 18, it is important that `act` is used in **unit tests** around every programmatic mutation. Without it, changes won't propagate!
-   The React 18 support is poor-mans support; that is, we don't do anything yet to play nicely with suspense features. Although e.g. [startTransition](https://github.com/mweststrate/platform-app/commit/bdd995773ddc6551235a4d2b0a4c9bd57d30510e) basically works, MobX as is doesn't respect the suspense model and will always reflect the latest state that is being rendered with, so tearing might occur. I think this is in theoretically addressable by using `useSyncExternalStore` and capturing the current values with together with the dependency tree of every component instance. However that isn't included in this pull request 1) it would be a breaking change, whereas the current change is still compatible with React 16 and 17. 2) I want to collect use cases where the tearing leads to problems first to build a better problem understanding. If you run into the problem, please submit an issue describing your scenario, and a PR with a unit tests demonstrating the problem in simplified form. For further discussion see #2526, #3005
