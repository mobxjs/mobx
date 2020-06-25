## Feature work

-   [ ] Build process
    -   [x] kill v4 / v5 separation
    -   [x] TSDX build process
-   [ ] Smaller build
    -   [x] fixup build, restore asset bundling
    -   ~[ ] create prod esm build?~
    -   [x] minimal dev errors
    -   [x] invariant system from immer
    -   [x] check all calls to top-level
            build, tree-shakeable etc?
    -   [x] add **PURE** annotations?
    -   [x] extract utils for getOwnPropertyDescriptor and defineProperty
    -   [x] configure property mangling like in Immer. Will it save anything?
-   [ ] code mod
    -   [x] code mod, run on v4 tests?
    -   [x] codemod TS
    -   [x] codemod babel
    -   [x] codemod leave decorators
    -   [x] migrate decorate calls as well
    -   [ ] migrate privates correctly
    -   [ ] unit tests for `ignoreImports`
    -   [ ] unit tests for `keepDecorators`
-   [ ] ES5 support
    -   [x] combine with ES5?
    -   [x] backport tests and code to v4(6)
    -   [x] make sure legacy array implementation is opt in
    -   [ ] map / set as opt-in as well?
    -   [x] compare mobx.configure options between v4 and v5
    -   [ ] two or 3 modes for configure useProxies? If two, kill `deep` option to observable?
-   [ ] annotations instead of decorators
    -   [ ] update typings for makeObservable with private keys
    -   [x] get rid of all that pending decorators shizzle
    -   [x] Todo: check how important array of decorators is, see original issue -> This will be breaking issue, as we are going to treat action etc different?
    -   [ ] Optimize: cache meta data
    -   [x] observable / extendObservable use decorators args
    -   [x] observable; support `false` as argument
-   [ ] misc
    -   [x] revisit safety model
    -   [ ] at startup, test presence of Map, Symbol ownPropertySymboles and other globals!
    -   [x] verify: action called from computed throws?
    -   [ ] apply deprecation of find and findIndex error
    -   [ ] verify perf / memory changes
    -   [ ] investigate skipped tests
    -   [ ] process TODO's
    -   [ ] weakmap for hasMaps in Map (and Set?)
    -   [ ] add a solution for keepAlive computeds like https://github.com/mobxjs/mobx/issues/2309#issuecomment-598707584
    -   [ ] update useLocalStore in mobx-react-lite to use autoMakeObservable
    -   [ ] include #2343
    -   [ ] default observable requires reaction?
    -   [ ] kill globalstate options?
    -   [ ] no auto lifting? https://twitter.com/getify/status/1258137826241241088
    -   [ ] flow types
    -   [ ] Would be awesome, but no idea how to go about that :) We could maybe at random places (e.g in observableValue) check in DEV mode if a value is a class instance with decorators, but with undecorated members. Might be a bit of a performance bummer though.

## Docs / migration guide

PHilosophy: one thing to do things

-   [ ] Host old docs somewhere? Figure out how docusaurus can support a second version
-   [ ] Using the codemod
-   [ ] update tsconfig, no decorators, yes define
-   [ ] update docs for non-default decoratres
-   [ ] instruct using TS / Babel decorators
-   [ ] Breaking: can no longer re-decorate fields already decorated by a superclass
-   [ ] Breaking: methods will be actions by default in `extendObservabe` / `observable`
-   [ ] Breaking: `decorate` has been removed
-   [ ] Breaking: `observableRequiresReaction` is now the default
-   [ ] Breaking: `enforceActions` is now defaulted to `observed`, but now generates a warning rather than an error
-   [ ] Breaking: `runInAction` now longer supports a name as first argument. Use an action or named function instead
-   [ ] Breaking: `computed` doesn not accept setter function as second argument anymore, use `options.set` instead
-   [ ] Breaking: the `findIndex` / `find` offset argument (third) on onbservable arrays is no longer supported, in consistentcy with ES arrays
-   [ ] Breaking: option `computedConfigurable` was dropped and is the default now
-   [ ] Breaking: a setter function as second argument to `computed` is no longer supported, use `computed(getter, { set: setter })` instead
-   [ ] Breaking: toJS no longer supports the `recurseEverything` option
-   [ ] optimization tip: hoist the mapping constant
-   [ ] document: uncoditional map
-   [ ] document `true` and `false` as annotations
-   [ ] how to enable ES5 support
-   [ ] observable.array now supports proxy:false option
-   [ ] migration: migrate mobx4 to mobx5 first, don't test on old browsers, then go to 6
-   [ ] Breaking: no generic decorators or lists anymore for extendObservable?
-   [ ] Breaking: dropped `intercept` and `observe` as array & map methods, use the mobx utilities instead
-   [ ] Breaking: dropped array.toJS, use .slice() instead
-   [ ] Breaking dropped Map.toPOJO / toJS / toJSON , use new Map(map) instead
-   [ ] Breaking: Map.toJSON now returns the entries array
-   [ ] Breaking dropped Set.toJS, use new Set(observableSet) instead
-   [ ] Breaking Set.toJSON returns an array now
-   [ ] Running codemod: yarn jscodeshift -t codemod/undecorate.ts test/v5/base/typescript-tests.ts --ignoreImports=true
-   [ ] killed: IGNORE_MOBX_MINIFY_WARNING
-   [ ] Document: recommended settings for prod versus experimentation
-   [ ] Migration: document switching from 4 to 5: configure( ) with proxies, requiresReqction, enforceActions
-   [ ] makeObservable + private members in TypeScript (second call? computed name? tsignore?)
-   [ ] print deprecation warnings for all old apis in mobx 4/5
-   [ ] Breaking: it is no longer safe to call action from autorun. Use effect or reaction instead.
-   [ ] \_allowStateChangesINComputation is no longer needed, us `runInAction` instead.
-   [ ] Breaking: in computed, the when predicate, and reaction predicate it is never allowed to directly change state. State changes should be wrapped in action.

## NOTES

### New state changes model:

action

-   enter batching,
-   state updates allowed, only if not tracking -or- in effect

effect

-   disable tracking + action

track

-   enable tracking
-   disable updates

Side effects like state changes are not allowed inside derivations. You can explicitly suppress this message by using 'effect', at your own risk.

State changes are not allowed outside actions.

## Blog

-   mobx 6 is more backward compatible than its predecessor
    Things fixed:
-   initialization in babel
-   babel setup
-   forward compatible with new field initialzers (in babel / ts flag)
-   CRA setup out of the box
-   size reduction
-   maintainability
-   migration:
    -   codemod
    -   babel macro / transform
        Less dev ergonomics. But
-   unblocks future lang compatiblity (define semantics)
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
