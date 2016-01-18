declare const global: any;

export class MobservableGlobals {
	version = 1; // 
	derivationStack: IDerivation[] = [];
	mobservableObjectId = 0;
	inTransaction = 0;
    inUntracked = 0;
    isRunningReactions = false;
    isComputingComputedValue = 0;
	changedAtoms: { atom: IAtom, observersToNotify: IDerivation[] }[] = [];
	pendingReactions: IReaction[] = [];
    afterTransactionItems: Lambda[] = []; // TODO: is this needed?
    nonStrictMode = 0;
}


const globals = (() => {
    const res = new MobservableGlobals();
    /**
    * Backward compatibility check
    */
    if (global.__mobservableTrackingStack || global.__mobservableViewStack || (global.__mobservableGlobal && global.__mobservableGlobal.version !== globals.version))
	   throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");
    if (global.__mobservableGlobal)
        return global.__mobservableGlobal;
    return global.__mobservableGlobal = res;    
})();

export default globals;

export function getNextId() {
    return ++globals.mobservableObjectId;
}

// TODO: move to derivation
export function isComputingDerivation() {
	return stackDepth() > 0;
}

// TODO: move to derivation
export function stackDepth () {
	return globals.derivationStack.length;
}

// TODO: move to derivation
export function checkIfStateIsBeingModifiedDuringDerivation(name: string) {
// TODO: kill nonStrictMode check? how does that relate to ES6 props?
    if (globals.isComputingComputedValue > 0 && globals.nonStrictMode === 0) {
        // TODO: add url with detailed error subscription / best practice here:
        const ts = globals.derivationStack;
        throw new Error(
`[mobservable] It is not allowed to change the state during the computation of a reactive view.`);
    }
}

// TODO: move to observable
export function untracked<T>(action:()=>T):T {
    globals.inUntracked++;
    const res = action();
    globals.inUntracked--;
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
    for (var key in defaultGlobals)
        globals[key] = defaultGlobals[key];
}

import {IAtom} from "./atom";
import {IReaction} from "./reaction";
import {Lambda} from "../interfaces";
import {IDerivation} from "./derivation";