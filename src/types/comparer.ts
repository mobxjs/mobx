export interface IEqualsComparer<T> {
    (a: T, b: T): boolean;
}

export var identityComparer: IEqualsComparer<any> = (a: any, b: any) => a === b;
export var structuralComparer: IEqualsComparer<any> = (a: any, b: any) => {
	if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
        return true;
	}
    return deepEqual(a, b);
};
export var defaultComparer: IEqualsComparer<any> = (a: any, b: any) => {
	if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
        return true;
	}
    return identityComparer(a, b);
};

import { deepEqual } from '../utils/utils';
