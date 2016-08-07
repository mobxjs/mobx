import {IDerivation, trackDerivedFunction, clearObserving, shouldCompute} from "./derivation";
import {globalState} from "./globalstate";
import {getNextId, Lambda, unique, joinStrings} from "../utils/utils";
import {isSpyEnabled, spyReport, spyReportStart, spyReportEnd} from "./spy";
import {startBatch, endBatch} from "./observable";
import {invariant} from "../utils/utils";

/**
 * Reactions are a special kind of derivations. Several things distinguishes them from normal reactive computations
 *
 * 1) They will always run, whether they are used by other computations or not.
 * This means that they are very suitable for triggering side effects like logging, updating the DOM and making network requests.
 * 2) They are not observable themselves
 * 3) They will always run after any 'normal' derivations
 * 4) They are allowed to change the state and thereby triggering themselves again, as long as they make sure the state propagates to a stable state in a reasonable amount of iterations.
 *
 * The state machine of a Reaction is as follows:
 *
 * 1) after creating, the reaction should be started by calling `runReaction` or by scheduling it (see also `autorun`)
 * 2) the `onInvalidate` handler should somehow result in a call to `this.track(someFunction)`
 * 3) all observables accessed in `someFunction` will be observed by this reaction.
 * 4) as soon as some of the dependencies has changed the Reaction will be rescheduled for another run (after the current mutation or transaction). `isScheduled` will yield true once a dependency is stale and during this period
 * 5) `onInvalidate` will be called, and we are back at step 1.
 *
 */

export interface IReactionPublic {
		dispose: () => void;
	}

export class Reaction implements IDerivation, IReactionPublic {
	observing = []; // nodes we are looking at. Our value depends on these nodes
	newObserving = [];
	dependenciesState = -1;
	diffValue = 0;
	runId = 0;
	unboundDepsCount = 0;
	__mapid = "#" + getNextId();   // use strings for map distribution, just nrs will result in accidental sparse arrays... // NOT NEEDED ANYMORE
	isDisposed = false;
	_isScheduled = false;
	_isTrackPending = false;
	_isRunning = false;

	constructor(public name: string = "Reaction@" + getNextId(), private onInvalidate: () => void) { }

	onBecomeStale() {
		this.schedule();
	}

	schedule() {
		if (!this._isScheduled) {
			this._isScheduled = true;
			globalState.pendingReactions.push(this);
			startBatch();
			runReactions();
			endBatch();
		}
	}

	isScheduled() {
		return this.dependenciesState > 0 || this._isScheduled;
	}

	/**
	 * internal, use schedule() if you intend to kick off a reaction
	 */
	runReaction() {
		if (!this.isDisposed) {
			this._isScheduled = false;
			if (shouldCompute(this)) {
				this._isTrackPending = true;

				this.onInvalidate();
				if (this._isTrackPending && isSpyEnabled()) {
					// onInvalidate didn't trigger track right away..
					spyReport({
						object: this,
						type: "scheduled-reaction"
					});
				}
			}
		}
	}

	track(fn: () => void) {
		startBatch();
		const notify = isSpyEnabled();
		let startTime;
		if (notify) {
			startTime = Date.now();
			spyReportStart({
				object: this,
				type: "reaction",
				fn
			});
		}
		this._isRunning = true;
		trackDerivedFunction(this, fn);
		this._isRunning = false;
		this._isTrackPending = false;
		if (this.isDisposed) {
			// disposed during last run. Clean up everything that was bound after the dispose call.
			clearObserving(this);
		}
		if (notify) {
			spyReportEnd({
				time: Date.now() - startTime
			});
		}
		endBatch();
	}

	recoverFromError() {
		this._isRunning = false;
		this._isTrackPending = false;
	}

	dispose() {
		if (!this.isDisposed) {
			this.isDisposed = true;
			if (!this._isRunning) {
				startBatch();
				clearObserving(this); // if disposed while running, clean up later. Maybe not optimal, but rare case
				endBatch();
			}
		}
	}

	getDisposer(): Lambda & { $mosbservable: Reaction } {
		const r = this.dispose.bind(this);
		r.$mobx = this;
		return r;
	}

	toString() {
		return `Reaction[${this.name}]`;
	}
	// TODO  change whyRun messages to be adequate to new system???
	whyRun() {
		const observing = unique(this.observing).map(dep => dep.name);

		return (`
WhyRun? reaction '${this.name}':
 * Status: [${this.isDisposed ? "stopped" : this._isRunning ? "running" : this.isScheduled() ? "scheduled" : "idle"}]
 * This reaction will re-run if any of the following observables changes:
    ${joinStrings(observing)}
    ${(this._isRunning) ? " (... or any observable accessed during the remainder of the current run)" : ""}
	Missing items in this list?
	  1. Check whether all used values are properly marked as observable (use isObservable to verify)
	  2. Make sure you didn't dereference values too early. MobX observes props, not primitives. E.g: use 'person.name' instead of 'name' in your computation.
`
		);
	}
}

/**
 * Magic number alert!
 * Defines within how many times a reaction is allowed to re-trigger itself
 * until it is assumed that this is gonna be a never ending loop...
 */
const MAX_REACTION_ITERATIONS = 100;

export function runReactions() {
	invariant(globalState.inBatch > 0, "INTERNAL ERROR runReactions should be called only inside batch");
	if (globalState.isRunningReactions === true || globalState.inTransaction > 0)
		return;
	globalState.isRunningReactions = true;
	const allReactions = globalState.pendingReactions;
	let iterations = 0;

	// While running reactions, new reactions might be triggered.
	// Hence we work with two variables and check whether
	// we converge to no remaining reactions after a while.
	while (allReactions.length > 0) {
		if (++iterations === MAX_REACTION_ITERATIONS)
			throw new Error("Reaction doesn't converge to a stable state. Probably there is a cycle in the reactive function: " + allReactions[0].toString());
		let remainingReactions = allReactions.splice(0);
		for (let i = 0, l = remainingReactions.length; i < l; i++)
			remainingReactions[i].runReaction();
	}
	globalState.isRunningReactions = false;
}
