import { getAtom } from "../types/type-utils"
import { getMessage } from "../utils/messages"
import { mobxState } from "../globalstate"
import { isComputedValue, isReaction } from "../../mobx-core/index"

function log(msg: string): string {
	console.log(msg)
	return msg
}

export function whyRun(thing?: any, prop?: string) {
	switch (arguments.length) {
		case 0:
			thing = mobxState.trackingDerivation
			if (!thing) return log(getMessage("m024"))
			break
		case 2:
			thing = getAtom(thing, prop)
			break
	}
	thing = getAtom(thing)
	if (isComputedValue(thing)) return log(thing.whyRun())
	else if (isReaction(thing)) return log(thing.whyRun())
	return fail(getMessage("m025"))
}
