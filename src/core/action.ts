import {transactionStart, transactionEnd} from "../core/transaction";
import {invariant} from "../utils/utils";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {isComputedValue} from "../core/computedvalue";
import {globalState} from "../core/globalstate";

export function createAction(actionName: string, fn: Function): Function {
	invariant(typeof fn === "function", "`action` can only be invoked on functions");
	invariant(typeof actionName === "string" && actionName.length > 0, `actions should have valid names, got: '${actionName}'`);
	const res = function () {
		return executeAction(actionName, fn, this, arguments);
	};
	(res as any).isMobxAction = true;
	return res;
}

export function executeAction(actionName: string, fn: Function, scope: any, args?: IArguments) {
	// actions should not be called from computeds. check only works if the computed is actively observed, but that is fine enough as heuristic
	invariant(!isComputedValue(globalState.trackingDerivation), "Computed values or transformers should not invoke actions or trigger other side effects");

	const notifySpy = isSpyEnabled();
	let startTime: number = 0;
	if (notifySpy) {
		startTime = Date.now();
		const l = (args && args.length) || 0;
		const flattendArgs = new Array(l);
		if (l > 0) for (let i = 0; i < l; i++)
			flattendArgs[i] = args![i];
		spyReportStart({
			type: "action",
			name: actionName,
			fn,
			target: scope,
			arguments: flattendArgs
		});
	}
	const prevUntracked = untrackedStart();
	transactionStart(actionName, scope, false);
	const prevAllowStateChanges = allowStateChangesStart(true);

	try {
		return fn.apply(scope, args);
	}
	finally {
		allowStateChangesEnd(prevAllowStateChanges);
		transactionEnd(false);
		untrackedEnd(prevUntracked);
		if (notifySpy)
			spyReportEnd({ time: Date.now() - startTime });
	}
}

export function useStrict(strict: boolean): any {
	invariant(globalState.trackingDerivation === null, "It is not allowed to set `useStrict` when a derivation is running");
	globalState.strictMode = strict;
	globalState.allowStateChanges = !strict;
}

export function isStrictModeEnabled(): boolean {
	return globalState.strictMode;
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
	const prev = allowStateChangesStart(allowStateChanges);
	const res = func();
	allowStateChangesEnd(prev);
	return res;
}

export function allowStateChangesStart(allowStateChanges: boolean) {
	const prev = globalState.allowStateChanges;
	globalState.allowStateChanges = allowStateChanges;
	return prev;
}

export function allowStateChangesEnd(prev: boolean) {
	globalState.allowStateChanges = prev;
}
