import {IObservable, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction} from "./derivation";
import state, {getNextId, isComputingDerivation} from "./global";
import SimpleEventEmitter from "../simpleeventemitter";
import {invariant} from "../utils";
import {reportTransition} from "../extras";

export default class Reaction implements IDerivation {
	id = getNextId();
	name; string;
	observing: IObservable[] = []; // nodes we are looking at. Our value depends on these nodes
	dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
	disposed = false;
	
	constructor(name: string = "", private onInvalidate:()=>void) {
		this.name = name || ("Reaction#" + this.id);
	}

	onBecomeObserved() {
		// noop, reaction is always unobserved
	}
	
	onBecomeUnobserved() {
		// noop, reaction is always unobserved
	}

	onDependenciesReady(): boolean {
		state.pendingReactions.push(this);
		return false; // reactions never propagate changes
	}

	/**
	 * internal
	 */
	runReaction() {
		if (!this.disposed) {
			this.onInvalidate();
			reportTransition(this, "READY", true); // a reaction has always 'changed'.
		}
	}

	track(fn:() => void) {
		trackDerivedFunction(this, fn);
	}
	
	dispose() {
		if (!this.disposed) {
			this.disposed = true;
			const deps = this.observing.splice(0);
			for(var i = 0, l = deps.length; i < l; i++)
				removeObserver(deps[i], this);
		}
	}

	toString() {
		return `Reaction[${this.name}]`;
	}
}