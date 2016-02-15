import {IAtom} from "./atom";
import {IDerivation} from "./derivation";
import {Reaction} from "./reaction";

declare const global: any;

export class MobservableGlobals {
	version = 1; //
	derivationStack: IDerivation[] = [];
	mobservableObjectId = 0;
	inTransaction = 0;
	inUntracked = 0;
	isRunningReactions = false;
	isComputingComputedValue = 0;
	changedAtoms: IAtom[] = [];
	pendingReactions: Reaction[] = [];
	allowStateChanges = true;
}

export const globalState = (() => {
	const res = new MobservableGlobals();
	/**
	 * Backward compatibility check
	 */
	if (global.__mobservableTrackingStack || global.__mobservableViewStack || (global.__mobservableGlobal && global.__mobservableGlobal.version !== globalState.version))
		throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");
	if (global.__mobservableGlobal)
		return global.__mobservableGlobal;
	return global.__mobservableGlobal = res;
})();

export function getNextId() {
	return ++globalState.mobservableObjectId;
}

export function registerGlobals() {
	// no-op to make explicit why this file is loaded
}

/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
export function resetGlobalState() {
	const defaultGlobals = new MobservableGlobals();
	for (let key in defaultGlobals)
		globalState[key] = defaultGlobals[key];
}
