# Plan: Remove legacy APIs from `packages/mobx`

**Goal**: Remove a set of public MobX APIs and every implementation detail that exists only to support them, leaving the remaining public surface and internal reactivity intact.

**Branch**: `mobx8-cleanup` (already checked out). One commit per feature area for reviewability.

**Tech stack**: TypeScript, Rollup build, Jest tests (`jest --config jest.projects.js`), `tsc --noEmit` for types.

## APIs being removed

Object API (top-level exports only — instance methods on Observable Map/Set/Array are KEPT):
`get`, `has`, `set`, `remove`, `keys`, `values`, `entries`, `ownKeys`

Introspection: `getDebugName`, `getDependencyTree`, `getObserverTree`

Interception / observation: `intercept`, `observe`, `_interceptReads`, `spy`

Concept: the entire `dehancer` mechanism.

## Decisions (confirmed with the requester)

1. **Object-API scope**: remove only the standalone `mobx.get/set/has/remove/keys/values/entries/ownKeys` functions in `src/api/object-api.ts`. KEEP `map.get()/set()/has()/keys()/values()/entries()`, `set.has()`, `array.remove()` — these are part of the Map/Set/Array contract and used by the proxy traps / internals. In particular the administration methods `keys_`, `set_`, `delete_`, `has_`, `get_`, `ownKeys_` on `ObservableObjectAdministration` STAY (used by `dynamicobject.ts` proxy traps).
2. **Docs**: delete the now-empty topic pages and prune all references (see per-commit doc steps + the final doc sweep).
3. **Downstream**: update the single dependent spot, `packages/mobx-react-lite/src/useObserver.ts` (uses `getDependencyTree`), so the monorepo still builds. No other package changes.

## What is KEPT (do NOT remove — shared/core machinery)

-   `IEnhancer` and all enhancer functions (`deepEnhancer`, `shallowEnhancer`, `referenceEnhancer`, `refStructEnhancer`) and per-admin `enhancer_` fields — the enhancer concept is core observable creation, distinct from the dehancer.
-   `getAtom`, `getAdministration`, `getObservers`, `hasObservers`, `IDepTreeNode`, `IObservable` — broad core infra.
-   `defineProperty` / `apiDefineProperty` (lives in `object-api.ts`) and error code `39`.
-   `IMapEntry`, `IMapEntries`, `IKeyValueMap` — general map types, not change events.
-   `untrackedStart/End`, batch helpers, mutation constants (`ADD/UPDATE/DELETE/REMOVE/SPLICE/CREATE`).

## Verification (run after every commit, from `packages/mobx`)

```bash
cd packages/mobx
yarn jest --config jest.projects.js            # or: npx jest --config jest.projects.js
npx tsc --noEmit                                # type check
npx eslint src/**/*                             # lint (catches unused imports)
```

For commit 6 also build the whole monorepo / mobx-react-lite so the downstream fix is validated.

**Error codes**: error codes that are no longer thrown after a removal are cleaned up (deleted from `errors.ts`) in the same commit. Before deleting a code, confirm no remaining caller: `grep -rn "die(<N>)" packages/mobx/src`. Codes are a sparse map, so removing keys needs no renumbering.

**globalState cleanup**: `globalState` (`core/globalstate.ts`) is a public object, but fields that no longer make sense after a removal ARE cleaned up. Any commit that changes the shape of `MobXGlobals` (add/remove a field, or change `persistentKeys`) MUST bump `MOBX_GLOBALS_VERSION` (`core/globalstate.ts:4`) so the multi-version-in-memory guard (`globalstate.ts:158`) stays correct. In this plan only commit 1 (removing `spyListeners`) touches globalState, so bump `7` → `8` there.

**`base/api.js`** (`__tests__/base/api.js`) asserts the exact set of `Object.keys(mobx)`. It is updated **per commit** to reflect the export surface after that commit — this incremental change is intended. Every export removed in a commit must be deleted from its expected array in that same commit, or the whole suite fails.

---

## Dependency / execution order

| Commit | Feature                             | Notes                                                                                                              |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1      | `spy`                               | Most cross-cutting (action/reaction/computed + all observable types). Removes devtools hook's `spy` ref.           |
| 2      | `intercept` + interceptor machinery | `*WillChange` types, `interceptChange`, error 14.                                                                  |
| 3      | `_interceptReads` + `dehancer`      | `_interceptReads` is the only writer of `dehancer`; remove together. Removes `raw()`.                              |
| 4      | `observe` + listener machinery      | `*DidChange` types (now unused after spy+observe gone).                                                            |
| 5      | Object API                          | `get/has/set/remove/keys/values/entries/ownKeys`, errors 5–11 & 38.                                                |
| 6      | Introspection                       | `getDebugName/getDependencyTree/getObserverTree` + mobx-react-lite fix + devtools hook removal + final docs sweep. |

Each commit is independently green. Commits 1–5 are largely independent; do them in this order to keep type-only cleanups (change-event interfaces) clean.

---

## Commit 1 — Remove `spy`

**Delete**

-   `src/core/spy.ts` entirely (`isSpyEnabled`, `spyReport`, `spyReportStart`, `spyReportEnd`, `END_EVENT`, `PureSpyEvent`, `SpyEvent`, `spy`).
-   `internal.ts:30` (`export * from "./core/spy"`).
-   `mobx.ts:39` (`spy` export) and the whole **Devtools hook** block (`mobx.ts:158-167`) — it is spy-centric; this also drops its `getDebugName` reference (removed in commit 6) and the `spy` import at `mobx.ts:28`.
-   `globalState.spyListeners` field (`core/globalstate.ts:106`) and its entry in `persistentKeys` (`core/globalstate.ts:11`). Then **bump `MOBX_GLOBALS_VERSION`** (`core/globalstate.ts:4`) from `7` → `8`, since the internal state shape changed (see "globalState cleanup" note below).
-   Spy-only change type `IComputedDidChange` (`core/computedvalue.ts:47-54`) — verify no remaining use (`observe` builds its computed-change object inline, so it does not need the type; confirm before deleting).
-   `IBoxDidChange<T>` (`observablevalue.ts:39-47`) — spy-only, not exported.

**Strip `spyReport*` / `isSpyEnabled` call sites and their imports** in:

-   `core/action.ts` (`_startAction` ~97-108, `_endAction` ~154-156, imports ~5-8)
-   `core/reaction.ts` (`runReaction_` ~138-144, `track` ~160-168 & ~183-187, `reportExceptionInDerivation_` ~209-216, imports ~14-17)
-   `core/computedvalue.ts` (`trackAndCompute` ~265-274, imports)
-   `types/observablevalue.ts` (constructor CREATE ~75-84, `set` ~98-112, imports)
-   `types/observablearray.ts` (`notifyArrayChildUpdate_` ~266-275, `notifyArraySplice_` ~296-306, imports)
-   `types/observablemap.ts` (`delete`/`updateValue_`/`addValue_`, imports)
-   `types/observableset.ts` (`add`/`delete`, imports)
-   `types/observableobject.ts` (`setObservablePropValue_`, `delete_`, `notifyPropertyAddition_`, imports)

Keep the `notifyListeners(...)` calls that sit alongside the removed `spyReport(...)` calls — those belong to `observe` (removed in commit 4). Only remove the spy half here.

**Tests**

-   Delete `__tests__/base/spy.js`.
-   `__tests__/base/extras.js`: remove the `"spy 1"` test (~143-162).
-   Remove `mobx.spy` usage (and any resulting empty assertions) from: `base/observables.js` (~893, 934, 985), `base/action.js` (~311, 471), `base/flow.js` (~162), `base/typescript-tests.ts` (~532-685), `base/babel-tests.js` (~324-491), `base/stage3-decorators.ts` (~380-524). Where spy is only a logging probe inside a broader test, drop the spy scaffolding but keep the rest of the test (per "keep minimal").
-   `base/api.js`: remove `"spy"` from the expected exports array.
-   Regenerate/prune affected snapshots under `__tests__/base/__snapshots__/` (`spy`, `observables`, `flow`, decorator files).

**Docs**

-   `docs/analyzing-reactivity.md`: remove the `spy` section (~48-84).
-   `docs/intercept-and-observe.md`: remove the `spy` row in the event-overview table (~150).
-   `docs/api.md`: remove the `spy` entry (~465-470).

**Commit**: `git commit -am "refactor(mobx): remove spy API and spy reporting machinery"`

---

## Commit 2 — Remove `intercept` + interceptor machinery

**Delete**

-   `src/api/intercept.ts` entirely; `internal.ts:39`; `mobx.ts:94` (`intercept`).
-   `src/types/intercept-utils.ts` entirely (`IInterceptor`, `IInterceptable`, `hasInterceptors`, `registerInterceptor`, `interceptChange`); `internal.ts:48`; `mobx.ts:47` (`IInterceptable`), `mobx.ts:48` (`IInterceptor`).
-   Error code `14` (`errors.ts:26`).

**Strip per-class interceptor support** (field `interceptors_`, `implements IInterceptable`, and each `hasInterceptors(this)`/`interceptChange(...)` block):

-   `types/observablevalue.ts` (field ~61, `prepareNewValue_` ~118-128)
-   `types/observablearray.ts` (field ~117, `spliceWithArray_` ~199-212, `set_` ~320-331)
-   `types/observablemap.ts` (field ~94, `set` ~139-150, `delete` ~161-170)
-   `types/observableset.ts` (field ~67, `add` ~115-127, `delete` ~160-169)
-   `types/observableobject.ts` (field ~91, `setObservablePropValue_` ~166-177, `defineProperty_` ~322-338, `defineObservableProperty_` ~376-387, `defineComputedProperty_` ~441-451, `delete_` ~495-505)

**Remove `*WillChange` change-event types** (used only by interceptors) and their `mobx.ts` exports:

-   `IValueWillChange` (`observablevalue.ts`; `mobx.ts:54`)
-   `IArrayWillChange`, `IArrayWillSplice` (`observablearray.ts`; `mobx.ts:58,59`)
-   `IMapWillChange` (`observablemap.ts`; `mobx.ts:68`)
-   `ISetWillChange`, `ISetWillAddChange`, `ISetWillDeleteChange` (`observableset.ts`; `mobx.ts:75`)
-   `IObjectWillChange` (`observableobject.ts`; `mobx.ts:71`)

**Tests**

-   Delete `__tests__/base/intercept.js`.
-   `base/object-api.js`: remove the intercept portions of the `observe & intercept` tests (~423-477); keep any observe-only assertions until commit 4.
-   `base/map.js` (~1249, 1308), `base/set.js` (~478-514): remove `intercept`-based sub-tests, keeping surrounding map/set behavior tests.
-   `base/typescript-tests.ts` (~2151-2261): remove intercept type-inference tests.
-   `base/api.js`: remove `"intercept"` from expected exports.

**Docs**

-   `docs/intercept-and-observe.md`: remove the `intercept` sections (~15, 18-68). (Page fully deleted in commit 4.)
-   `docs/api.md`: remove the `intercept` entry (~281-286).

**Commit**: `git commit -am "refactor(mobx): remove intercept API and interceptor machinery"`

---

## Commit 3 — Remove `_interceptReads` + the `dehancer` concept

**Delete**

-   `src/api/intercept-read.ts` entirely (`interceptReads`, `ReadInterceptor`); `internal.ts:38`; `mobx.ts:141` (`interceptReads as _interceptReads`).

**Strip per-admin `dehancer` field + dehance methods and every call site**:

-   `types/observablevalue.ts`: field `dehancer` (~64), `dehanceValue` (~87-92) and its call in `get()` (~150); also remove `raw()` (~153-156) — it exists only to return the un-dehanced value.
-   `types/observablearray.ts`: field (~120), `dehanceValue_` (~134-139), `dehanceValues_` (~141-146), and calls in `get_` (~311), `spliceWithArray_` (~225), the `remove` extension (~454), and read helpers `simpleFunc` (~508), `mapLikeFunc` (~518), `reduceLikeFunc` (~530). Each becomes a plain pass-through of the raw value(s).
-   `types/observablemap.ts`: field `dehancer` (~96), `dehanceValue_` (~297-302), calls in `get` (~278, 280).
-   `types/observableset.ts`: field `dehancer` (~68), `dehanceValue_` (~85-90), calls in `has` (~204), `values` (~229).
-   (`ObservableObjectAdministration` has no dehancer field — nothing to do there.)

Do NOT touch `enhancer_` fields or `IEnhancer` — those are core.

**Tests**

-   `__tests__/base/array.js`: remove the `"dehances last value on shift/pop"` test (~538-552) and the entire `describe("dehances")` block (~698-880). These are the only dehancer tests and use `mobx._getAdministration(array).dehancer` directly.
-   `base/api.js`: remove `"_interceptReads"` from expected exports.

**Docs**: none (`_interceptReads`/`dehancer` are undocumented).

**Commit**: `git commit -am "refactor(mobx): remove _interceptReads and the dehancer concept"`

---

## Commit 4 — Remove `observe` + listener machinery

**Delete**

-   `src/api/observe.ts` entirely; `internal.ts:43`; `mobx.ts:93` (`observe`).
-   `src/types/listen-utils.ts` entirely (`IListenable`, `hasListeners`, `registerListener`, `notifyListeners`); `internal.ts:49`; `mobx.ts:49` (`IListenable`).

**Strip per-class listener support** (field `changeListeners_`, `implements IListenable`, and each `hasListeners`/`notifyListeners` block):

-   `types/observablevalue.ts` (field ~62, `setNewValue_` ~138-145)
-   `types/observablearray.ts` (field ~118, `notifyArrayChildUpdate_` ~250-271, `notifyArraySplice_` ~279-303) — after removing both spy (commit 1) and listeners, simplify these notify methods to just the atom `reportChanged()`/core mutation they still need.
-   `types/observablemap.ts` (field ~95, `delete` ~173-198, `updateValue_` ~212-231, `addValue_` ~253-269)
-   `types/observableset.ts` (field ~66, `add` ~134-150, `delete` ~172-193)
-   `types/observableobject.ts` (field ~90, `setObservablePropValue_` ~182-203, `delete_` ~510-566, `notifyPropertyAddition_` ~574-599)

**Remove `*DidChange` change-event types** (now unused after spy + observe removal) and their `mobx.ts` exports:

-   `IValueDidChange` (`observablevalue.ts`; `mobx.ts:53`)
-   `IArrayDidChange`, `IArrayUpdate`, `IArraySplice`, `IArrayBaseChange` (`observablearray.ts`; `mobx.ts:60,61,62`)
-   `IMapDidChange` (`observablemap.ts`; `mobx.ts:69`)
-   `ISetDidChange` (`observableset.ts`; `mobx.ts:74`)
-   `IObjectDidChange` (`observableobject.ts`; `mobx.ts:51`)

Let `tsc --noEmit` confirm each type is truly unused before deleting.

**Tests**

-   Delete `__tests__/base/observe.ts`.
-   Remove `observe`-based tests / probes from: `base/observables.js` (boxed/computed `.observe`), `base/map.js`, `base/set.js`, `base/array.js` (change-event tests), `base/object-api.js` (~423-477, the remaining observe half), `base/makereactive.js` (~165-198), `base/tojs.js` (~72-85), `base/errorhandling.js` (~248, 285 — keep the cycle test, replace the `observe` probe with an `autorun`/`reaction` equivalent if it's load-bearing), `base/typescript-tests.ts`, `base/babel-tests.js` (~193-195, 513), `base/stage3-decorators.ts`, `base/stage3-decorators-inheritance.ts`, `perf/perf.js` (~52).
-   `base/api.js`: remove `"observe"` from expected exports.
-   Prune affected snapshots.

**Docs**

-   Delete `docs/intercept-and-observe.md` and remove its sidebar/nav entry.
-   `docs/api.md`: remove the `observe` entry (~288-293).

**Commit**: `git commit -am "refactor(mobx): remove observe API and change-listener machinery"`

---

## Commit 5 — Remove object API (`get/has/set/remove/keys/values/entries/ownKeys`)

**Edit `src/api/object-api.ts`** — remove the functions `keys`, `values`, `entries`, `set`, `remove`, `has`, `get`, and `apiOwnKeys` (with their overload signatures) plus any now-unused imports. **Keep `apiDefineProperty`** (exported as `defineProperty`) and whatever it imports. The file continues to exist.

**Exports**

-   `mobx.ts:106-113`: remove `keys, values, entries, set, remove, has, get, apiOwnKeys as ownKeys`. Keep `apiDefineProperty as defineProperty`.
-   `internal.ts:42`: leave `export * from "./api/object-api"` (still exports `apiDefineProperty`).

**Errors**: remove codes `5, 6, 7, 8, 9, 10, 11, 38` (`errors.ts:17-23, 69`). Keep `39` (defineProperty). Before deleting code `42` — do NOT; the object-api `set()` used `die(42)` but code 42 ("Invalid index") is also used by array internals — verify with `grep -rn "die(42)" packages/mobx/src` and keep it (expected: still referenced).

**Keep** the admin methods `keys_`, `set_`, `delete_`, `has_`, `get_`, `ownKeys_`, `defineProperty_` on `ObservableObjectAdministration` — required by `dynamicobject.ts` proxy traps.

**Tests**

-   Delete `__tests__/base/object-api.js` (by now only object-API tests remain in it, after commits 2 & 4 stripped the observe/intercept parts). If any non-object-API test snuck in, migrate it out first.
-   `base/map.js`, `base/set.js`: replace `mobx.keys(x)/mobx.values(x)/mobx.entries(x)` with the instance-method equivalents (`[...x.keys()]`, `[...x.values()]`, `[...x.entries()]`) — these tests exercise Map/Set behavior; keep them, just swap the helper.
-   `base/proxies.js` (~132, 137): replace incidental `keys(x)` usage.
-   `base/typescript-tests.ts` (~1729): remove/replace incidental `mobx.keys(new B())`.
-   `base/api.js`: remove `get, has, set, remove, keys, values, entries, ownKeys` from expected exports.

**Docs**

-   Delete `docs/collection-utilities.md` and remove its sidebar/nav entry.
-   `docs/api.md`: remove the `values/keys/entries/set/remove/has/get` entries (~350-397).

**Commit**: `git commit -am "refactor(mobx): remove top-level object API (get/set/has/remove/keys/values/entries/ownKeys)"`

---

## Commit 6 — Remove introspection (`getDebugName/getDependencyTree/getObserverTree`) + downstream fix

**Delete**

-   `src/api/extras.ts`: `getDependencyTree` (~13-15), `getObserverTree` (~27-29), private helpers `nodeToDependencyTree` (~17-25), `nodeToObserverTree` (~31-39), `unique` (~41-43, if unused elsewhere), and types `IDependencyTree` (~3-6), `IObserverTree` (~8-11). If the file becomes empty, delete it and its `internal.ts:36` re-export; otherwise leave the remaining exports.
-   `getDebugName` in `src/types/type-utils.ts` (~91-104). Keep `getAtom`/`getAdministration` (broadly used).
-   `mobx.ts`: remove `IObserverTree, IDependencyTree, getDependencyTree, getObserverTree` (~126-129) and `getDebugName` (~132). Confirm the devtools hook (already removed in commit 1) leaves no dangling `getDebugName` reference.

**Downstream fix**

-   `packages/mobx-react-lite/src/useObserver.ts`: remove the `getDependencyTree` import (line 1) and the `React.useDebugValue(adm.reaction!, getDependencyTree)` call (line ~90). Drop the debug-value line entirely (or replace with `React.useDebugValue(adm.reaction!)`).

**Tests**

-   `__tests__/base/extras.js`: remove the `"treeD"` test (~6-81) and the `getDebugName` tests (~217-263, ~878-964). If nothing meaningful remains, delete the file.
-   `base/make-observable.ts` (~588-589): remove the incidental `getDebugName` usage.
-   `base/api.js`: remove `getDebugName, getDependencyTree, getObserverTree` from expected exports.

**Docs**

-   Delete `docs/analyzing-reactivity.md` (spy section already gone in commit 1; remove the rest) and its sidebar/nav entry.
-   `docs/api.md`: remove `getDebugName/getDependencyTree/getObserverTree` entries (~472-491).
-   `docs/understanding-reactivity.md` (~71-83): remove the `getDependencyTree` import + code sample.
-   Grep the docs sidebar/site config (e.g. `sidebars*.js`, `*.json`, docusaurus config) for the deleted page filenames and remove those nav entries.

**Verify** the full monorepo builds (mobx + mobx-react-lite) in addition to the standard per-commit checks.

**Commit**: `git commit -am "refactor(mobx): remove getDebugName/getDependencyTree/getObserverTree introspection APIs"`

---

## Anticipated trouble / risks

1. **`spy` is the most invasive** — it is woven through `action`, `reaction`, `computedvalue`, and all five observable types. Doing it first (commit 1) isolates the churn. Watch for now-dead imports/constants after the `spyReport` blocks are removed.
2. **`base/api.js` export-list guard** fails the _entire_ suite the moment any export is removed. Update its expected array in the same commit that removes each export.
3. **Snapshot tests** (`spy`, `extras`, `object-api`, `observables`, `flow`, decorator files) will drift; regenerate with `jest -u` or delete obsolete snapshot entries. Review the diff — don't blindly `-u`.
4. **Instance-method vs top-level name collision**: many tests call `.get()/.set()/.has()/.keys()` on Observable Map/Set as _methods_; only `mobx.get(...)` etc. are being removed. Grep carefully to avoid touching valid instance-method calls. Likewise `array.remove(...)` stays.
5. **`observe` in error-handling/cycle tests** (`base/errorhandling.js`) may be load-bearing for triggering reactions, not just probing. Replace with `autorun`/`reaction` rather than deleting the test outright.
6. **Change-event type deletion timing**: `*WillChange` are safe to delete with `intercept` (commit 2); `*DidChange` must wait until BOTH `spy` and `observe` are gone (commit 4). Rely on `tsc --noEmit` to confirm zero references before each type deletion.
7. **Error codes**: codes are a sparse map (2–4 already commented out), so removing keys needs no renumbering. Delete the no-longer-thrown codes in the same commit as the feature. Verify `die(42)` (used by object-api `set` AND array internals) stays — grep before removing any code.
8. **`dehancer` / `raw()` removal** (commit 3): the dehancer and `ObservableValue.raw()` existed for mobx-state-tree to read un-dehanced values. MST is **no longer supported**, so removing them wholesale is intended (not just acceptable). Note it in the changeset.
9. **Devtools hook** (`__MOBX_DEVTOOLS_GLOBAL_HOOK__`) depends on `spy` + `getDebugName`; it is removed wholesale in commit 1. `mobx-devtools` will no longer receive data — intended given `spy` is gone.
10. **Changesets**: this repo uses Changesets (`.changeset/`). Add a `major` changeset describing the removals so the release notes are correct.
