import {Lambda, once} from "../utils/utils";

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
	const interceptors = interceptable.interceptors;
	if (interceptors) {
		for (let i = 0, l = interceptors.length; i < l; i++) {
			change = interceptors[i](change);
			if (!change)
				return null;
		}
	}
	return change;
}