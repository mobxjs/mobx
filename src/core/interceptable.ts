import {globalState} from "./globalstate";
import {Lambda, once, invariant} from "../utils/utils";

export type IInterceptor<T> = (change: T) => T;

export interface IInterceptable<T> {
	interceptors: IInterceptor<T>[];
	intercept(handler: IInterceptor<T>): Lambda;
}

export function hasInterceptors(interceptable: IInterceptable<any>) {
	return globalState.interceptors.length > 0 || (interceptable.interceptors && interceptable.interceptors.length > 0);
}

export function registerInterceptor<T>(interceptable: IInterceptable<T>, handler: IInterceptor<T>): Lambda {
	interceptable.interceptors.push(handler);
	return once(() => {
		const idx = interceptable.interceptors.indexOf(handler);
		if (idx !== -1)
			interceptable.interceptors.splice(idx, 1);
	});
}

export function interceptChange<T>(interceptable: IInterceptable<T>, change: T): T {
	return interceptChangeRunner(globalState, interceptChangeRunner(interceptable, change));
}

function interceptChangeRunner<T>(interceptable: IInterceptable<T>, change: T): T {
	const interceptors = interceptable.interceptors;
	if (interceptors) {
		for (let i = 0, l = interceptors.length; i < l; i++) {
			change = interceptors[i](change);
			//invariant(!!change, "Intercept handlers should always return a change object");
			if (!change)
				return null;
		}
	}
	return change;
}