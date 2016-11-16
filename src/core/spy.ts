import {globalState} from "./globalstate";
import {objectAssign, once, Lambda} from "../utils/utils";

export function isSpyEnabled() {
	return !!globalState.spyListeners.length;
}

export function spyReport(event) {
	if (!globalState.spyListeners.length)
		return false;
	const listeners = globalState.spyListeners;
	for (let i = 0, l = listeners.length; i < l; i++)
		listeners[i](event);
}

export function spyReportStart(event) {
	const change = objectAssign({}, event, { spyReportStart: true });
	spyReport(change);
}

const END_EVENT = { spyReportEnd: true };

// TODO: change signature to spyReportEnd(time?: number)
export function spyReportEnd(change?) {
	if (change)
		spyReport(objectAssign({}, change, END_EVENT));
	else
		spyReport(END_EVENT);
}

export function spy(listener: (change: any) => void): Lambda {
	globalState.spyListeners.push(listener);
	return once(() => {
		const idx = globalState.spyListeners.indexOf(listener);
		if (idx !== -1)
			globalState.spyListeners.splice(idx, 1);
	});
}
