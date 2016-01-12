declare const global: any;

export class MobservableGlobals {
	version = 1; // 
	derivationStack: IDerivation[] = [];
	mobservableObjectId = 0;
	inTransaction = 0;
    inUntracked = 0;
    isRunningReactions = false;
	changedAtoms: { atom: IAtom, observersToNotify: IDerivation[] }[] = [];
	pendingReactions: IReaction[] = [];
    afterTransactionItems: Lambda[] = []; // TODO: is this needed?
}


/**
 * Backward compatibility check
 */
let globals = new MobservableGlobals();

if (global.__mobservableTrackingStack || global.__mobservableViewStack || (global.__mobservableGlobal && global.__mobservableGlobal.version !== globals.version))
	throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");

if (global.__mobservableGlobal)
    globals = global.__mobservableGlobal; 
else 
    global.__mobservableGlobal = globals;

export default globals;

export function getNextId() {
    return ++globals.mobservableObjectId;
}

export function isComputingDerivation() {
	return globals.derivationStack.length > 0;
}

export function stackDepth () {
	return globals.derivationStack.length;
}

export function checkIfStateIsBeingModifiedDuringDerivation(name: string) {
    if (isComputingDerivation() && !globals.isRunningReactions) {
        // TODO: add url with detailed error subscription / best practice here:
        const ts = globals.derivationStack;
        throw new Error(
`[mobservable] It is not allowed to change the state during the computation of a reactive view. Should the data you are trying to modify actually be a view? 
Use 'mobservable.extras.withStrict(false, block)' to allow changes to be made inside views (unrecommended).
View name: ${name}.
Current stack size is ${ts.length}, active view: "${ts[ts.length -1].toString()}".`
        );
    }
}

export function untracked<T>(action:()=>T):T {
    globals.inUntracked++;
    const res = action();
    globals.inUntracked--;
    return res;
}

export function registerGlobals() {
	// no-op to make explicit why this file is loaded
}

import {IAtom} from "./atom";
import {IReaction} from "./reaction";
import {Lambda} from "../interfaces";
import {IDerivation} from "./derivation";