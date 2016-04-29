import {Lambda, once} from "../utils/utils";
import {globalState} from "../core/globalstate";

export interface IListenable {
	changeListeners: Function[];
}

export function hasListeners(listenable: IListenable) {
	return globalState.changeListeners.length > 0 || (listenable.changeListeners && listenable.changeListeners.length > 0);
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

export function notifyListeners<T>(listenable: IListenable, change: T, changeNormalizer? : (change: T, callback: Function) => void) {
	if (listenable !== globalState && globalState.changeListeners.length > 0)
		notifyListeners.apply(globalState, change); // global state events are never normalized
	const listeners = listenable.changeListeners.slice();
	if (changeNormalizer) {
		for (let i = 0, l = listeners.length; i < l; i++)
			changeNormalizer(change, listeners[i]);
	}
	else {
		for (let i = 0, l = listeners.length; i < l; i++)
			listeners[i](change);
	}
}
