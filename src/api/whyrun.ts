import {globalState} from "../core/globalstate";
import {ComputedValue} from "../core/computedvalue";
import {Reaction} from "../core/reaction";
import {getAtom} from "../types/type-utils";
import {invariant} from "../utils/utils";

function log(msg: string): string {
	console.log(msg);
	return msg;
}

export function whyRun(thing?: any, prop?: string) {
	switch (arguments.length) {
		case 0:
			thing = globalState.derivationStack[globalState.derivationStack.length - 1];
			if (!thing)
				return log("whyRun() can only be used if a derivation is active, or by passing an computed value / reaction explicitly. If you invoked whyRun from inside a computation; the computation is currently suspended but re-evaluating because somebody requested it's value.");
			break;
		case 2:
			thing = getAtom(thing, prop);
			break;
	}
	thing = getAtom(thing);
	if (thing instanceof ComputedValue)
		return log(thing.whyRun());
	else if (thing instanceof Reaction)
		return log(thing.whyRun());
	else
		invariant(false, "whyRun can only be used on reactions and computed values");
}
