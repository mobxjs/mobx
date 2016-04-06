import {IAtom} from "./atom";
import {IDerivation} from "./derivation";
import {Reaction} from "./reaction";

declare const global: any;

export class MobXGlobals {
	version = 1; //
	derivationStack: IDerivation[] = [];
	mobxGuid = 0;
	inTransaction = 0;
	inUntracked = 0;
	isRunningReactions = false;
	isComputingComputedValue = 0;
	changedAtoms: IAtom[] = [];
	pendingReactions: Reaction[] = [];
	allowStateChanges = true;
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
	const resetId = globalState.resetId;
	const defaultGlobals = new MobXGlobals();
	for (let key in defaultGlobals)
		globalState[key] = defaultGlobals[key];
	globalState.resetId = resetId + 1;
}
