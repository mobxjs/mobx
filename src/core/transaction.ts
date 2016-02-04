import {globalState} from "./globalstate";
import {propagateAtomReady} from "./atom";

/**
 * Magic number alert!
 * Defines within how many times a reaction is allowed to re-trigger itself
 * until it is assumed that this is gonna be a never ending loop...
 */
const MAX_REACTION_ITERATIONS = 100;

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
export function transaction<T>(action: () => T, thisArg?): T {
	globalState.inTransaction += 1;
	const res = action.call(thisArg);
	if (--globalState.inTransaction === 0) {
		// TODO: splice needed?
		// TODO: while needed?
		const values = globalState.changedAtoms.splice(0);
		for (let i = 0, l = values.length; i < l; i++)
			propagateAtomReady(values[i].atom, values[i].observersToNotify);

		runReactions();

		// TODO: needed?
		const actions = globalState.afterTransactionItems.splice(0);
		for (let i = 0, l = actions.length; i < l; i++)
			actions[i]();
	}
	return res;
}

// TODO: what is this good for?
export function runAfterTransaction(action: () => void) {
	if (globalState.inTransaction === 0)
		action();
	else
		globalState.afterTransactionItems.push(action);
}

// TODO: move to reaction
export function runReactions() {
	if (globalState.isRunningReactions)
		return;
	globalState.isRunningReactions = true;
	const pr = globalState.pendingReactions;
	let iterations = 0;
	while (pr.length) {
		if (++iterations === MAX_REACTION_ITERATIONS)
			throw new Error("Reaction doesn't converge to a stable state. Probably there is a cycle in your computations: " + pr[0].toString());
		let rs = pr.splice(0);
		for (let i = 0, l = rs.length; i < l; i++)
			rs[i].runReaction();
	}
	globalState.isRunningReactions = false;
}