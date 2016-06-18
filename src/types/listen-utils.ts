import {Lambda, once} from "../utils/utils";
import {untrackedStart, untrackedEnd} from "../core/derivation";

export interface IListenable {
	changeListeners: Function[];
	observe(handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean): Lambda;
}

export function hasListeners(listenable: IListenable) {
	return listenable.changeListeners && listenable.changeListeners.length > 0;
}

export function registerListener<T>(listenable: IListenable, handler: Function): Lambda {
	const listeners = listenable.changeListeners || (listenable.changeListeners = []);
	listeners.push(handler);
	return once(() => {
		const idx = listeners.indexOf(handler);
		if (idx !== -1)
			listeners.splice(idx, 1);
	});
}

export function notifyListeners<T>(listenable: IListenable, change: T | T[]) {
	const prevU = untrackedStart();
	let listeners = listenable.changeListeners;
	if (!listeners)
		return;
	listeners = listeners.slice();
	for (let i = 0, l = listeners.length; i < l; i++) {
		if (Array.isArray(change)) {
			listeners[i].apply(null, change);
		}
		else {
			listeners[i](change);
		}
	}
	untrackedEnd(prevU);
}
