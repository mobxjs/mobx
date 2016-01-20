import {IObservable, removeObserver} from "./observable";
import {IDerivation, trackDerivedFunction} from "./derivation";
import state, {getNextId, isComputingDerivation} from "./global";
import SimpleEventEmitter from "../simpleeventemitter";
import {invariant} from "../utils";
import {reportTransition} from "../extras";

export interface IReaction extends IDerivation {
	runReaction();	
}

export default class Reaction implements IReaction {
	id = getNextId();
	observing: IObservable[] = [];       // nodes we are looking at. Our value depends on these nodes
	dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
	dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
	derivation:()=>void;
	disposed = false;
	
	// TODO: bind derivation immediately, don't store scope
	constructor(derivation:()=>void, private scope: Object, public name:string) {
		if (!this.name)
			this.name = "Reaction#" + this.id;
		this.derivation = () => derivation.call(scope); // TODO: use bind?
		// TODO: don't bother whether we are in a transaction; see latest mobservable-react issue
		// but how would that impact the performance of createTransformer?
		if (isComputingDerivation() || state.inTransaction > 0)
			state.pendingReactions.push(this);
		else
			this.runReaction(); 
	}
	
	onBecomeUnobserved() {
		// noop, reaction is always unobserved
	}

	onDependenciesReady(): boolean {
		state.pendingReactions.push(this);
		return false; // reactions never propagate changes
	}

	runReaction() {
		if (!this.disposed) {
			trackDerivedFunction(this, this.derivation);
			reportTransition(this, "READY", true); // a reaction has always 'changed'.
		}
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
