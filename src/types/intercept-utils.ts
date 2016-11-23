import {Lambda, once, invariant} from "../utils/utils";
import {untrackedStart, untrackedEnd} from "../core/derivation";

export type IInterceptor<T> = (change: T) => T;

export interface IInterceptable<T> {
	interceptors: IInterceptor<T>[];
	intercept(handler: IInterceptor<T>): Lambda;
}

export function hasInterceptors(interceptable: IInterceptable<any>) {
	return (interceptable.interceptors && interceptable.interceptors.length > 0);
}

export function registerInterceptor<T>(interceptable: IInterceptable<T>, handler: IInterceptor<T>): Lambda {
	const interceptors = interceptable.interceptors || (interceptable.interceptors = []);
	interceptors.push(handler);
	return once(() => {
		const idx = interceptors.indexOf(handler);
		if (idx !== -1)
			interceptors.splice(idx, 1);
	});
}

export function interceptChange<T>(interceptable: IInterceptable<T>, change: T): T {
	const prevU = untrackedStart();
	try {
		const interceptors = interceptable.interceptors;
		for (let i = 0, l = interceptors.length; i < l; i++) {
			change = interceptors[i](change);
			invariant(!change || (change as any).type, "Intercept handlers should return nothing or a change object");
			if (!change)
				break;
		}
		return change;
	} finally {
		untrackedEnd(prevU);
	}
}
