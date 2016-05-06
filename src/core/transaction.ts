import {globalState} from "./globalstate";
import {propagateAtomReady} from "./atom";
import {runReactions} from "./reaction";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "./spy";

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
export function transaction<T>(action: () => T, thisArg = undefined, report = true): T {
	globalState.inTransaction += 1;
	if (report && isSpyEnabled()) {
		spyReportStart({
			type: "transaction",
			target: thisArg,
			name: ((action as any).name) || "anonymous transaction"
		});
	}
	const res = action.call(thisArg);
	if (--globalState.inTransaction === 0) {
		const values = globalState.changedAtoms.splice(0);
		for (let i = 0, l = values.length; i < l; i++)
			propagateAtomReady(values[i]);

		runReactions();
	}
	if (report && isSpyEnabled())
		spyReportEnd();
	return res;
}