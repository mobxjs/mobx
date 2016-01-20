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
    // TODO: strict check withStrict(this.externalRefenceCount === 0, () => { // TODO: always with strict once autorun has own derivable
    result = f();
    // });
    bindDependencies(derivation, prevObserving);
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

    for (var i = 0, l = added.length; i < l; i++) {
        var dependency = added[i];
        // only check for cycles on new dependencies, existing dependencies cannot cause a cycle..
        if (findCycle(derivation, dependency))
			throw new Error(`${this.toString()}: Found cyclic dependency in computed value '${this.derivation.toString()}'`);
        addObserver(added[i], derivation);
    }

    // remove observers after adding them, so that they don't go in lazy mode to early
    for (var i = 0, l = removed.length; i < l; i++)
        removeObserver(removed[i], derivation);
}

function findCycle(needle:IDerivation, node:IObservable):boolean {
    const obs = node.observing;
    if (!obs)
        return false;
    if (obs.indexOf(node) !== -1)
        return true;
    for(let l = obs.length, i = 0; i < l; i++)
        if (findCycle(needle, obs[i]))
            return true;
    return false;
}