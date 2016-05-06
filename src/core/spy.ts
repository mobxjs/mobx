import {globalState} from "./globalstate";

export function isSpyEnabled() {
	return globalState.spyListeners.length > 0;
}

export function spyReport(event) {
	const listeners = globalState.spyListeners;
	for (let i = 0, l = listeners.length; i < l; i++)
		listeners[i](event);
}

export function spyReportStart(event) {
	event.start = true;
	spyReport(event);
}

const END_EVENT = { end: true };

export function spyReportEnd() {
	spyReport(END_EVENT);
}