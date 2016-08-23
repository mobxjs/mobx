import {globalState} from "./globalstate";
import {objectAssign, deprecated, once, Lambda} from "../utils/utils";

let spyEnabled = false;

export function isSpyEnabled() {
	return spyEnabled;
}

export function spyReport(event) {
	if (!spyEnabled)
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
	spyEnabled = globalState.spyListeners.length > 0;
	return once(() => {
		const idx = globalState.spyListeners.indexOf(listener);
		if (idx !== -1)
			globalState.spyListeners.splice(idx, 1);
		spyEnabled = globalState.spyListeners.length > 0;
	});
}

export function trackTransitions(onReport?: (c: any) => void): Lambda {
	deprecated("trackTransitions is deprecated. Use mobx.spy instead");
	if (typeof onReport === "boolean") {
		deprecated("trackTransitions only takes a single callback function. If you are using the mobx-react-devtools, please update them first");
		onReport = arguments[1];
	}
	if (!onReport) {
		deprecated("trackTransitions without callback has been deprecated and is a no-op now. If you are using the mobx-react-devtools, please update them first");
		return () => {};
	}
	return spy(onReport);
}