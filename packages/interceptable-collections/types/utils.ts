export function isPlainObject(value: any) {
	if (value === null || typeof value !== "object") return false
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

export function makeNonEnumerable(object: any, propNames: string[]) {
	for (let i = 0; i < propNames.length; i++) {
		addHiddenProp(object, propNames[i], object[propNames[i]])
	}
}

export function addHiddenProp(object: any, propName: string, value: any) {
	Object.defineProperty(object, propName, {
		enumerable: false,
		writable: true,
		configurable: true,
		value
	})
}

export function addHiddenFinalProp(object: any, propName: string, value: any) {
	Object.defineProperty(object, propName, {
		enumerable: false,
		writable: false,
		configurable: true,
		value
	})
}
