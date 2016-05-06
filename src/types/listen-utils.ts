import {Lambda, once} from "../utils/utils";
import {untracked} from "../core/observable";

export interface IListenable {
	changeListeners: Function[];
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
	untracked(() => {
		let listeners = listenable.changeListeners;
		if (!listeners)
			return;
		listeners = listeners.slice();
		if (Array.isArray(change)) {
			for (let i = 0, l = listeners.length; i < l; i++)
				listeners[i].apply(null, change);
		}
		else {
			for (let i = 0, l = listeners.length; i < l; i++)
				listeners[i](change);
		}
	});
}
