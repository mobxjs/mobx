import { deepEqual } from '../utils/utils';

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean;
}

export function identityComparer(a: any, b: any): boolean {
    return a === b;
}

export function structuralComparer(a: any, b: any): boolean {
	if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
        return true;
	}
    return deepEqual(a, b);
}

export function defaultComparer(a: any, b: any): boolean {
	if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
        return true;
	}
    return identityComparer(a, b);
}
