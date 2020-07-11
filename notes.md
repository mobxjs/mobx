## Feature work

-   [x] Build process
    -   [x] kill v4 / v5 separation
    -   [x] TSDX build process
-   [x] Smaller build
    -   [x] fixup build, restore asset bundling
    -   [x] ~create prod esm build?~
    -   [x] minimal dev errors
    -   [x] invariant system from immer
    -   [x] check all calls to top-level
            build, tree-shakeable etc?
    -   [x] add **PURE** annotations?
    -   [x] extract utils for getOwnPropertyDescriptor and defineProperty
    -   [x] configure property mangling like in Immer. Will it save anything?
-   [x] code mod
    -   [x] code mod, run on v4 tests?
    -   [x] codemod TS
    -   [x] codemod babel
    -   [x] codemod leave decorators
    -   [x] migrate decorate calls as well
    -   [x] migrate privates correctly
    -   [x] migrate `@observer` calls
    -   [c] migrate `@inject` calls
    -   [x] unit tests for `ignoreImports`
    -   [x] unit tests for `keepDecorators`
    -   [x] put in separate package
    -   [x] special case constuctor of React components
    -   [x] print // TODO about super calls
-   [x] ES5 support
    -   [x] combine with ES5?
    -   [x] backport tests and code to v4(6)
    -   [x] make sure legacy array implementation is opt in
    -   [x] ~map / set as opt-in as well?~
    -   [x] compare mobx.configure options between v4 and v5
    -   [x] two or 3 modes for configure useProxies? If two, kill `deep` option to observable?
-   [x] annotations instead of decorators
    -   [x] update typings for makeObservable with private keys
    -   [x] get rid of all that pending decorators shizzle
    -   [x] Todo: check how important array of decorators is, see original issue -> This will be breaking issue, as we are going to treat action etc different?
    -   [x] Optimize: cache meta data
    -   [x] observable / extendObservable use decorators args
    -   [x] observable; support `false` as argument
    -   [x] ~makeObservable don't warn about missing fields?~ use extendObservable instead
    -   [x] test late initialization (after declaring props)
-   [ ] misc
    -   [x] revisit safety model
    -   [x] at startup, test presence of Map, Symbol ownPropertySymboles and other globals!
    -   [x] verify: action called from computed throws?
    -   [x] apply deprecation of find and findIndex error
    -   [x] verify perf / memory changes -> general perf is similar (< 10% slower, class instanation is twice as slow...!?). Not sure if that is a problem or the result of difference in babel config in the first place (e.g. define props)
    -   [x] investigate skipped tests
    -   [x] process TODO's
    -   [x] ~weakmap for hasMaps in Map (and Set?)~ no: that would only works for objectish keys which is an exception and would require separate map collection
    -   [x] include #2343
    -   [x] kill globalstate options?
    -   [x] kill / fix flow types
    -   [x] enable search on docs
    -   [x] no binding by default? https://twitter.com/getify/status/1258137826241241088
    -   [x] fix https://github.com/mobxjs/mobx/issues/2394
    -   [x] fix UMD build depending on `global`
    -   [ ] check coverage
    -   [ ] default observable requires reaction?
    -   [ ] update ad links (https://www.google.com/adsense/new/u/0/pub-1705981461067724/home ?)
-   [ ] mobx-react
    -   [ ] displayname for observer components facebook/react#18026
    -   [ ] update useLocalStore in mobx-react-lite to use
            autoMakeObservable
    -   [ ] fix React unstable batch setup
-   [ ] post 6.0
    -   [ ] merge https://github.com/mobxjs/mobx/pull/2389
    -   [ ] set up discussions
    -   [ ] use autObservable options for codemod (if no superclass)?
    -   [ ] add a solution for keepAlive computeds like https://github.com/mobxjs/mobx/issues/2309#issuecomment-598707584
    -   [ ] set up continous delivery
    -   [ ] support chrome formatter https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html also in Immer?

## Docs / migration guide

Philosophy: one way to do things

Why classes

-   shared funcs
-   fixed shape, well optimized
-   better debug info

Why declare fields

-   optimized by JS engines
-   autocompletion in IDE
-   detect misspellings in makeObservable early

*   [ ] Host old docs somewhere? Figure out how docusaurus can support a second version
*   [ ] Using the codemod
*   [ ] update tsconfig, no decorators, yes define
*   [ ] update docs for non-default decorators
*   [ ] instruct using TS / Babel decorators
*   [ ] Breaking: can no longer re-decorate fields already decorated by a superclass
*   [ ] Breaking: methods will be actions by default in `extendObservable` / `observable`
*   [ ] Breaking: `decorate` has been removed
*   [ ] Breaking: `observableRequiresReaction` is now the default
*   [ ] Breaking: `enforceActions` is now defaulted to `observed`, but now generates a warning rather than an error
*   [ ] Breaking: `runInAction` now longer supports a name as first argument. Use an action or named function instead
*   [ ] Breaking: `computed` does not accept setter function as second argument anymore, use `options.set` instead
*   [ ] Breaking: the `findIndex` / `find` offset argument (third) on observable arrays is no longer supported, to be consistent with ES arrays
*   [ ] Breaking: option `computedConfigurable` was dropped and is the default now
*   [ ] Breaking: a setter function as second argument to `computed` is no longer supported, use `computed(getter, { set: setter })` instead
*   [ ] Breaking: toJS no longer supports the `recurseEverything` option
*   [ ] optimization tip: hoist the mapping constant
*   [ ] document: unconditional map
*   [ ] document `true` and `false` as annotations
*   [ ] how to enable ES5 support
*   [ ] observable.array now supports proxy:false option
*   [ ] migration: migrate mobx4 to mobx5 first, don't test on old browsers, then go to 6
*   [ ] Breaking: no generic decorators or lists anymore for extendObservable?
*   [ ] Breaking: dropped `intercept` and `observe` as array & map methods, use the mobx utilities instead
*   [ ] Breaking: dropped array.toJS, use .slice() instead
*   [ ] Breaking dropped Map.toPOJO / toJS / toJSON , use new Map(map) instead
*   [ ] Breaking: Map.toJSON now returns the entries array
*   [ ] Breaking dropped Set.toJS, use new Set(observableSet) instead
*   [ ] Breaking Set.toJSON returns an array now
*   [ ] Breaking: dropped Array.toJS, use .toJSON instead
*   [ ] Breaking: dropped .observe and .intercept on types, use the {observe, intercept} from 'mobx' instead
*   [ ] Running codemod: yarn jscodeshift -t codemod/undecorate.ts test/v5/base/typescript-tests.ts --ignoreImports=true
*   [ ] killed: IGNORE_MOBX_MINIFY_WARNING
*   [ ] Document: recommended settings for prod versus experimentation
*   [ ] Migration: document switching from 4 to 5: configure( ) with proxies, requiresReqction, enforceActions
*   [ ] makeObservable + private members in TypeScript (second call? computed name? tsignore?)
*   [ ] print deprecation warnings for all old apis in mobx 4/5
*   [ ] Breaking: it is no longer safe to call action from autorun. Use effect or reaction instead.
*   [ ] \_allowStateChangesINComputation is no longer needed, us `runInAction` instead.
*   [ ] Breaking: in computed, the when predicate, and reaction predicate it is never allowed to directly change state. State changes should be wrapped in action.
*   [ ] Breaking: `toJS` no longer takes action, and no longer converts Maps and Sets to plain data structures. Serializing data structures is out of scope for the MobX project, and write custom serialization methods are much more sustainable. You might even leverage @computed to serialize state.
*   [ ] Breaking: directly calling .get() / .set() on an observable array is no longer supported
*   [ ] Breaking: killed IObservableObject interface.
*   [ ] Breaking: sorting or reversing an array in an derivation will now throw rather than warn.
*   [ ] Breaking: sorting or reversing an array in an actino will no sort or reverse the source array rather than shallow copy.
*   Fixed #2326
*   Fixed #2379
*   [ ] Breaking: strict mode defaults to observed now
*   [ ] killed option `computedConfigurable` as it was the default already
*   [ ] document: `autoBind` options for observable / extendObservable / makeObserver

## NOTES

## Blog

-   mobx 6 is more backward compatible than its predecessor
    Things fixed:
-   initialization in babel
-   babel setup
-   forward compatible with new field initializers (in babel / ts flag)
-   CRA setup out of the box
-   size reduction
-   maintainability
-   migration:
    -   codemod
    -   babel macro / transform
        Less dev ergonomics. But
-   unblocks future lang compatibility (define semantics)
-   easier to adopt (this benefits everyone!)
-   compatiblity with CRA, eslint, etc etc out of the box
-   reduce library size
-   not two ways to learn everything
-   ease to re-decorate once decorators are standardized, still working on that!

## Mobx Size

## Original:

Import size report for mobx:
┌──────────────────────┬───────────┬────────────┬───────────┐
│ (index) │ just this │ cumulative │ increment │
├──────────────────────┼───────────┼────────────┼───────────┤
│ import \* from 'mobx' │ 16602 │ 0 │ 0 │
│ observable │ 13842 │ 13842 │ 0 │
│ computed │ 13915 │ 13930 │ 88 │
│ autorun │ 13845 │ 13946 │ 16 │
└──────────────────────┴───────────┴────────────┴───────────┘
(this report was generated by npmjs.com/package/import-size)

## After removing decorators;

Import size report for mobx:
┌──────────────────────┬───────────┬────────────┬───────────┐
│ (index) │ just this │ cumulative │ increment │
├──────────────────────┼───────────┼────────────┼───────────┤
│ import \* from 'mobx' │ 17296 │ 0 │ 0 │
│ observable │ 14362 │ 14362 │ 0 │
│ computed │ 14362 │ 14377 │ 15 │
│ autorun │ 14364 │ 14392 │ 15 │
│ action │ 14362 │ 14404 │ 12 │
│ enableDecorators │ 14388 │ 14404 │ 0 │
└──────────────────────┴───────────┴────────────┴───────────┘
(this report was generated by npmjs.com/package/import-size)

## After using TSDX

Basically the same.

## After **DEV**

Import size report for mobx:
┌──────────────────────┬───────────┬────────────┬───────────┐
│ (index) │ just this │ cumulative │ increment │
├──────────────────────┼───────────┼────────────┼───────────┤
│ import \* from 'mobx' │ 15333 │ 0 │ 0 │
│ observable │ 12629 │ 12629 │ 0 │
│ computed │ 12630 │ 12647 │ 18 │
│ autorun │ 12633 │ 12662 │ 15 │
│ action │ 12630 │ 12673 │ 11 │
└──────────────────────┴───────────┴────────────┴───────────┘
(this report was generated by npmjs.com/package/import-size)

## After mangking

Import size report for mobx:
┌──────────────────────┬───────────┬────────────┬───────────┐
│ (index) │ just this │ cumulative │ increment │
├──────────────────────┼───────────┼────────────┼───────────┤
│ import \* from 'mobx' │ 14767 │ 0 │ 0 │
│ observable │ 12037 │ 12037 │ 0 │
│ computed │ 12037 │ 12056 │ 19 │
│ autorun │ 12039 │ 12070 │ 14 │
│ action │ 12037 │ 12081 │ 11 │
└──────────────────────┴───────────┴────────────┴───────────┘
(this report was generated by npmjs.com/package/import-size)
