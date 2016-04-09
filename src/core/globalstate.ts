import {IAtom} from "./atom";
import {IDerivation} from "./derivation";
import {Reaction} from "./reaction";

declare const global: any;

export class MobXGlobals {
	/**
	 * MobXGlobals version.
	 * MobX compatiblity with other versions loaded in memory as long as this version matches.
	 * It indicates that the global state still stores similar information
	 */
	version = 1;

	/**
	 * Stack of currently running derivations
	 */
	derivationStack: IDerivation[] = [];

	/**
	 * 'guid' for general purpose. Mostly debugging.
	 */
	mobxGuid = 0;

	/**
	 * Are we in a transaction block? (and how many of them)
	 */
	inTransaction = 0;

	/**
	 * Are we in an untracked block? (and how many of them)
	 */
	inUntracked = 0;

	/**
	 * Are we currently running reactions?
	 * Reactions are run after derivations using a trampoline.
	 */
	isRunningReactions = false;

	/**
	 * List of observables that have changed in a transaction.
	 * After completing the transaction(s) these atoms will notify their observers.
	 */
	changedAtoms: IAtom[] = [];

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

	/**
	 * Used by createTransformer to detect that the global state has been reset.
	 */
	resetId = 0;
}

export const globalState = (() => {
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

export function getNextId() {
	return ++globalState.mobxGuid;
}

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
		if (key !== "mobxGuid" && key !== "resetId")
			globalState[key] = defaultGlobals[key];
}
