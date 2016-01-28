import {IObservable, propagateReadiness, propagateStaleness, reportObserved} from "./observable";
import {invariant, noop} from "../utils";
import globalState, {getNextId} from "./global";
import {reportTransition} from "../extras";
import {runReactions} from "./transaction";
import {IDerivation} from "./derivation";

export interface IAtom extends IObservable {
    isDirty: boolean;
}

export function propagateAtomReady(atom: IAtom, observersToNotify:IDerivation[]=atom.observers) {
    invariant(atom.isDirty);
    atom.isDirty = false;
    reportTransition(atom, "READY", true);
    propagateReadiness(atom, true, observersToNotify);
}

export class Atom implements IAtom {
    id = getNextId();
    name: string;
    isDirty = false;
    observers = []; // TODO: initialize lazily
    
    constructor(name: string, public onBecomeObserved: () => void = noop, public onBecomeUnobserved = noop) {
        this.name = name || ("Atom#" + this.id);
    }
    
    reportObserved() {
        reportObserved(this);
    }

    reportChanged() {
        if (!this.isDirty) {
            this.reportStale();
            this.reportReady();
        }
    }
    
    reportStale() {
        if (!this.isDirty) {
            this.isDirty = true;
            reportTransition(this, "STALE");
            propagateStaleness(this);
        }
    }
    
    reportReady(changed: boolean = true) {
        // TODO: check if dirty?
        if (globalState.inTransaction > 0)
            globalState.changedAtoms.push({atom: this, observersToNotify: this.observers.slice()});
        else {
            propagateAtomReady(this);
            runReactions();
        }
    }
    
    toString() {
        return `${this.name}`;
    }
}

export function atom(prefix: string, onBecomeObserved: () => void = noop, onBecomeUnobserved = noop) {
    return new Atom(prefix, onBecomeObserved, onBecomeUnobserved);
}