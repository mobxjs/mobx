import {IDerivation} from "./derivation";
import {Reaction} from "./reaction";
import {IObservable} from "./observable";

declare const global: any;

/**
 * These values will persist if global state is reset
 */
const persistentKeys = ["mobxGuid", "resetId", "spyListeners", "strictMode", "runId"];

export class MobXGlobals {
	/**
	 * MobXGlobals version.
	 * MobX compatiblity with other versions loaded in memory as long as this version matches.
	 * It indicates that the global state still stores similar information
	 */
	version = 4;

	/**
	 * Stack of currently running derivations
	 */
	trackingDerivation: IDerivation = null;

	/**
	 * Each time a derivation is tracked, it is assigned a unique run-id
	 */
	runId = 0;

	/**
	 * 'guid' for general purpose. Will be persisted amongst resets.
	 */
	mobxGuid = 0;

	/**
	 * Are we in a transaction block? (and how many of them)
	 */
	inTransaction = 0;

	/**
	 * Are we currently running reactions?
	 * Reactions are run after derivations using a trampoline.
	 */
	isRunningReactions = false;

	/**
	 * Are we in a batch block? (and how many of them)
	 */
	inBatch: number = 0;

	pendingUnobservations: IObservable[] = [];
	/**
	 * List of scheduled, not yet executed, reactions.
	 */
	pendingReactions: Reaction[] = [];

	/**
	 * Is it allowed to change observables at this point?
	 * In general, MobX doesn't allow that when running computations and React.render.
	 * To ensure that those functions stay pure.
	 */
	allowStateChanges = true;
	allowStateChangesStack = [];
	/**
	 * If strict mode is enabled, state changes are by default not allowed
	 */
	strictMode = false;

	/**
	 * Used by createTransformer to detect that the global state has been reset.
	 */
	resetId = 0;

	/**
	 * Spy callbacks
	 */
	spyListeners: {(change: any): void}[] = [];
}

export const globalState: MobXGlobals = (() => {
	const res = new MobXGlobals();
	/**
	 * Backward compatibility check
	 */
	if (global.__mobservableTrackingStack || global.__mobservableViewStack)
		throw new Error("[mobx] An incompatible version of mobservable is already loaded.");
	if (global.__mobxGlobal && global.__mobxGlobal.version !== res.version)
		throw new Error("[mobx] An incompatible version of mobx is already loaded.");
	if (global.__mobxGlobal)
		return global.__mobxGlobal;
	return global.__mobxGlobal = res;
})();

export function registerGlobals() {
	// no-op to make explicit why this file is loaded
}

/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
export function resetGlobalState() {
	globalState.resetId++;
	const defaultGlobals = new MobXGlobals();
	for (let key in defaultGlobals)
		if (persistentKeys.indexOf(key) === -1)
			globalState[key] = defaultGlobals[key];
	globalState.allowStateChanges = !globalState.strictMode;
}
