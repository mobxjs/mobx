import { getGlobal } from "../internal"

export function createWeakRef<T extends WeakKey>(item: T): WeakRef<T> {
    const global = getGlobal()
    if (global.WeakRef) {
        return new WeakRef(item)
    }
    return {
        deref: () => item,
        [Symbol.toStringTag]: "WeakRef"
    }
}
