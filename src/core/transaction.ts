import globalState from "./global";
import {reportAtomReady} from "./atom";

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
		for(var i = 0, l = values.length; i < l; i++)
			reportAtomReady(values[i].atom, values[i].observersToNotify);

		runReactions();

		// TODO: needed?
		const actions = globalState.afterTransactionItems.splice(0);
		for (var i = 0, l = actions.length; i < l; i++)
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

export function runReactions() {
	if (globalState.isRunningReactions)
		return;
	globalState.isRunningReactions = true;
	const pr = globalState.pendingReactions;
	while (pr.length) {
		var rs = pr.splice(0);
		for(var i = 0, l = rs.length; i < l; i++)
			rs[i].runReaction();
	}
	globalState.isRunningReactions = false;
}