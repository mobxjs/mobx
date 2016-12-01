import {fail} from "../utils/utils";

function modifierRemoved(name) {
	return fail(name +  " has been removed. Use modifiers instead. Please check the MobX 4 migration guide");
}

/**
 * @deprecated, see the MobX4 migration guide
 */
export function asReference<T>(): never {
	return modifierRemoved("asReference");
}

/**
 * @deprecated, see the MobX4 migration guide
 */
export function asStructure<T>(): never {
	return modifierRemoved("asStructure");
}

/**
 * @deprecated, see the MobX4 migration guide
 */
export function asFlat<T>(): never {
	return modifierRemoved("asFlat");
}

/**
 * @deprecated, see the MobX4 migration guide
 */
export function asMap<T>(): never {
	return modifierRemoved("asMap");
}
