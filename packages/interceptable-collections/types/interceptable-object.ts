import { addHiddenFinalProp, isPlainObject } from "./utils"

const interceptablePropertyConfigs: { [key: string]: PropertyDescriptor } = {}

function generateInterceptablePropConfig(propName: string) {
	return (
		interceptablePropertyConfigs[propName] ||
		(interceptablePropertyConfigs[propName] = {
			configurable: true,
			enumerable: true,
			get: function(this: any) {
				return this.__getter(propName)
			},
			set: function(this: any, v) {
				this.__setter(propName, v)
			}
		})
	)
}
export function interceptObject<T extends Object>(
	handlers: {
		get(key: string): any
		set(key: string, value: any): void
	},
	base: T
): T {
	if (!isPlainObject(base))
		throw new Error("Second argument to interceptObject should be a plain object")

	const res = {}

	addHiddenFinalProp(res, "__getter", handlers.get)
	addHiddenFinalProp(res, "__setter", handlers.get)

	extendInterceptableObject(res, base)
	return res as any
}

export function extendInterceptableObject<A, B>(base: A, newProps: B): A & B
export function extendInterceptableObject(base: any, newProps: any): any {
	if (!base.__setter) throw new Error("Not an interceptable object")
	if (!isPlainObject(newProps))
		throw new Error("Second argument to extendInterceptableObject should be a plain object")

	Object.keys(newProps).forEach(propName => {
		if (propName in base) base[propName] = newProps[propName]
		else {
			Object.defineProperty(base, propName, generateInterceptablePropConfig(propName))
			base[propName] = newProps[propName]
		}
	})

	return base
}
