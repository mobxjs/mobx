import {globalState} from "./globalstate";
import {runReactions} from "./reaction";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "./spy";

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
export function transaction<T>(action: () => T, thisArg = undefined, report = true): T {
	transactionStart(((action as any).name) || "anonymous transaction", thisArg, report);
	const res = action.call(thisArg);
	transactionEnd(report);
	return res;
}

export function transactionStart<T>(name: string, thisArg = undefined, report = true) {
	globalState.inTransaction += 1;
	if (report && isSpyEnabled()) {
		spyReportStart({
			type: "transaction",
			target: thisArg,
			name: name
		});
	}
}

export function transactionEnd<T>(report = true) {
	if (--globalState.inTransaction === 0) {
		runReactions();
	}
	if (report && isSpyEnabled())
		spyReportEnd();
}
