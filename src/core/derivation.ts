import {IObservable, IDepTreeNode, propagateReadiness, propagateStaleness, addObserver, removeObserver} from "./observable";
import {invariant, quickDiff} from "../utils";
import {reportTransition} from "../extras";
import globalState from "./global";

export interface IDerivation extends IDepTreeNode {
    observing: IObservable[];
    observers?: IDerivation[];
    dependencyStaleCount: number;
    dependencyChangeCount: number;
    onDependenciesReady():boolean;
}

export function notifyDependencyStale(derivation: IDerivation) {
    if (++derivation.dependencyStaleCount === 1) {
        reportTransition(derivation, "STALE");
        propagateStaleness(derivation);
    }
}

export function notifyDependencyReady(derivation: IDerivation, dependencyDidChange: boolean) {
    invariant(derivation.dependencyStaleCount > 0);
    if (dependencyDidChange)
        derivation.dependencyChangeCount += 1;
    if (--derivation.dependencyStaleCount === 0) {
        // all dependencies are ready
        if (derivation.dependencyChangeCount > 0) {
            // did any of the observables really change?
            derivation.dependencyChangeCount = 0;
            reportTransition(derivation, "PENDING");
            const changed = derivation.onDependenciesReady();
            propagateReadiness(derivation, changed);
        } else {
            // we're done, but didn't change, lets make sure verybody knows..
            reportTransition(derivation, "READY", false);
            propagateReadiness(derivation, false);
        }
    }
}

export function trackDerivedFunction<T>(derivation:IDerivation, f: () => T) {
    const prevObserving = trackDependencies(derivation);
    let hasError = true;
    let result:T;
    // TODO: no try catch
    try {
        // TODO: strict check withStrict(this.externalRefenceCount === 0, () => { // TODO: always with strict once autorun has own derivable
        result = f();
        // });
        hasError = false;
    } finally {
        if (hasError)
            // TODO: merge with computable view, use this.func.toString
            console.error(`[DerivedValue '${this.name}'] There was an uncaught error during the computation of a derived value. Please check the next exception.`);
        bindDependencies(derivation, prevObserving);
    }
    return result;
}

function trackDependencies(derivation: IDerivation):IObservable[] {
    const prevObserving = derivation.observing;
    derivation.observing = [];
    globalState.derivationStack.push(derivation);
    return prevObserving;
}

function bindDependencies(derivation: IDerivation, prevObserving: IObservable[]) {
    globalState.derivationStack.length -= 1;

    var [added, removed] = quickDiff(derivation.observing, prevObserving);

    // TODO: re-enable cycle detection
    //derivation.hasCycle = false;
    for (var i = 0, l = added.length; i < l; i++) {
    /*    var dependency = added[i];
        if (dependency instanceof DerivedValue){
            if (dependency.findCycle(this)) {
                derivation.hasCycle = true;
                // don't observe anything that caused a cycle, or we are stuck forever!
                derivation.observing.splice(derivation.observing.indexOf(added[i]), 1);
                dependency.hasCycle = true; // for completeness sake..
                continue;
            }
        }
    */    addObserver(added[i], derivation);
    }

    // remove observers after adding them, so that they don't go in lazy mode to early
    for (var i = 0, l = removed.length; i < l; i++)
        removeObserver(removed[i], derivation);
}