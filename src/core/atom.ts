import {IObservable, propagateReadiness, propagateStaleness} from "./observable";
import {invariant} from "../utils";
import globals from "./global";
import {reportTransition} from "../extras";
import {runReactions} from "./transaction";

export interface IAtom extends IObservable {
    isDirty: boolean;
}

export function reportAtomChanged(atom: IAtom) {
    if (!atom.isDirty) {
        atom.isDirty = true;
        reportTransition(atom, "STALE");
        propagateStaleness(atom);
        if (globals.inTransaction > 0)
            globals.changedAtoms.push(atom);
        else {
            reportAtomReady(atom);
            runReactions();
        }
    }
}

export function reportAtomReady(atom: IAtom) {
    invariant(atom.isDirty);
    atom.isDirty = false;
    reportTransition(atom, "READY", true);
    propagateReadiness(atom, true);
}