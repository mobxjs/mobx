import {transactionStart, transactionEnd} from "../core/transaction";
import {invariant} from "../utils/utils";
import {untrackedStart, untrackedEnd} from "../core/derivation";
import {isSpyEnabled, spyReportStart, spyReportEnd} from "../core/spy";
import {ComputedValue} from "../core/computedvalue";
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

export function executeAction(actionName: string, fn: Function, scope: any, args: IArguments) {
	// actions should not be called from computeds. check only works if the computed is actively observed, but that is fine enough as heuristic
	const ds = globalState.derivationStack;
	invariant(!(ds[ds.length - 1] instanceof ComputedValue), "Computed values or transformers should not invoke actions or trigger other side effects");

	const notifySpy = isSpyEnabled();
	let startTime: number;
	if (notifySpy) {
		startTime = Date.now();
		const l = (args && args.length) || 0;
		const flattendArgs = new Array(l);
		if (l > 0) for (let i = 0; i < l; i++)
			flattendArgs[i] = args[i];
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

export function useStrict(): boolean;
export function useStrict(strict: boolean);
export function useStrict(strict?: boolean): any {
	if (arguments.length === 0)
		return globalState.strictMode;
	else {
		invariant(globalState.derivationStack.length === 0, "It is not allowed to set `useStrict` when a derivation is running");
		globalState.strictMode = strict;
		globalState.allowStateChanges = !strict;
	}
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