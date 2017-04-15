import { deepEqual } from '../utils/utils';

export type EqualsComparer<T> = (a: T, b: T) => boolean;

export const equalityComparer = (a: any, b: any) => a == b;
export const identityComparer = (a: any, b: any) => a === b;
export const structuralComparer = (a: any, b: any) => deepEqual(a, b);
export const defaultComparer = (a: any, b: any) => {
    if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
        return true;
    }
    return identityComparer(a, b);
};
