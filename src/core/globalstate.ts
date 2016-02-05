import {IAtom} from "./atom";
import {IDerivation} from "./derivation";

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

// TODO: move to derivation
export function isComputingDerivation() {
	return stackDepth() > 0;
}

// TODO: move to derivation
export function stackDepth () {
	return globalState.derivationStack.length;
}

// TODO: move to derivation
export function checkIfStateModificationsAreAllowed() {
// TODO: kill nonStrictMode check? how does that relate to ES6 props?
// TODO: use invariant
	if (!globalState.allowStateChanges) {
		// TODO: add url with detailed error subscription / best practice here:
		throw new Error(
			`[mobservable] It is not allowed to change the state when a derivation is being computed. Are you sure that the value you are trying to change shouldn't be derived instead? Use 'extras.allowStateChanges(true, block)' to supress this message.`);
	}
}


// TODO: move to observable
export function untracked<T>(action: () => T): T {
	globalState.inUntracked++;
	const res = action();
	globalState.inUntracked--;
	return res;
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

import {Reaction} from "./reaction";
import {Lambda} from "../utils/utils";
