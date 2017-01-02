import {globalState} from "../core/globalstate";
import {isComputedValue} from "../core/computedvalue";
import {isReaction} from "../core/reaction";
import {getAtom} from "../types/type-utils";
import {fail, deprecated} from "../utils/utils";

function log(msg: string): string {
	console.log(msg);
	return msg;
}

export function whyRun(thing?: any, prop?: string) {
	switch (arguments.length) {
		case 0:
			thing = globalState.trackingDerivation;
			if (!thing)
				return log("whyRun() can only be used if a derivation is active, or by passing an computed value / reaction explicitly. If you invoked whyRun from inside a computation; the computation is currently suspended but re-evaluating because somebody requested it's value.");
			break;
		case 2:
			thing = getAtom(thing, prop);
			break;
	}
	thing = getAtom(thing);
	if (isComputedValue(thing))
		return log(thing.whyRun());
	else if (isReaction(thing))
		return log(thing.whyRun());
	return fail("whyRun can only be used on reactions and computed values");
}
