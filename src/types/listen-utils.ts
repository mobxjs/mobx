import {Lambda, once} from "../utils/utils";
import {globalState, MobXGlobals} from "../core/globalstate";
import {untracked} from "../core/observable";

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

export function notifyListeners<T>(listenable: IListenable, change: T, supressGlobalEvent?: boolean, changeNormalizer? : (change: T, callback: Function) => void) {
	untracked(() => {
		if (!(listenable instanceof MobXGlobals) && globalState.changeListeners.length > 0 && supressGlobalEvent !== true)
			notifyListeners(globalState, change); // global state events are never normalized
		let listeners = listenable.changeListeners;
		if (!listeners)
			return;
		listeners = listeners.slice();
		if (changeNormalizer) {
			for (let i = 0, l = listeners.length; i < l; i++)
				changeNormalizer(change, listeners[i]);
		}
		else {
			for (let i = 0, l = listeners.length; i < l; i++)
				listeners[i](change);
		}
	});
}
