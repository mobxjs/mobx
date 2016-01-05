import {IObservable} from "./observable";
import {IDerivation, trackDerivedFunction} from "./derivation";
import state, {getNextId, isComputingDerivation} from "./global";
import SimpleEventEmitter from "../simpleeventemitter";
import {invariant} from "../utils";

export interface IReaction extends IDerivation {
	runReaction();	
}

export default class Reaction implements IReaction {
	id = getNextId();
	observing: IObservable[] = [];       // nodes we are looking at. Our value depends on these nodes
	dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
	derivation:()=>void;
	
	// TODO: bind derivation immediately, don't store scope
	constructor(derivation:()=>void, private scope: Object, public name:string) {
		if (!this.name)
			this.name = "Reaction#" + this.id;
		this.derivation = () => derivation.call(scope); // TODO: use bind? 
	}
	
	onBecomeUnobserved() {
		// noop, reaction is always unobserved
	}

	onDependenciesReady(): boolean {
		state.pendingReactions.push(this);
		return false; // reactions never propagate changes
	}

	runReaction() {
		trackDerivedFunction(this, this.derivation);
	}

	toString() {
		return `Reaction[${this.name}]`;
	}
}
