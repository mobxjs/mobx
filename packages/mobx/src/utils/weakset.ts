interface WeakMapEntry<T extends {}> {
    ref: WeakRef<T>
    token: any
}

export class WeakRefSet<T extends {}> implements Set<T> {
    constructor(readonly onItemCleaned?: () => void) {
        this._registry = new FinalizationRegistry<WeakRef<T>>(key => {
            this._set.delete(key)
            this.onItemCleaned?.()
        })
    }

    private _set = new Set<WeakRef<T>>()
    private _map = new WeakMap<T, WeakMapEntry<T>>()
    private _registry: FinalizationRegistry<WeakRef<T>>

    get size() {
        return this._size()
    }
    [Symbol.toStringTag]: string = "[Object object]"

    protected _size() {
        return this._set.size
    }

    add(value: T): this {
        const entry: WeakMapEntry<T> = {
            ref: new WeakRef(value),
            token: {}
        }
        this._set.add(entry.ref)
        this._map.set(value, entry)
        this._registry.register(value, entry.ref, entry.token)
        return this
    }

    clear(): void {
        this._set.clear()
        this._map = new WeakMap()
    }

    delete(value: T): boolean {
        const entry = this._map.get(value)
        if (!entry) {
            return false
        }
        this._map.delete(value)
        this._registry.unregister(entry.token)
        return this._set.delete(entry.ref)
    }

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
        for (let v of this.values()) {
            callbackfn.call(thisArg, v, v, this)
        }
    }

    has(value: T): boolean {
        return this._map.has(value)
    }

    *values(): IterableIterator<T> {
        for (let v of this._set) {
            const ref = v.deref()
            if (ref == undefined) {
                continue
            }
            yield ref
        }
    }

    *entries(): IterableIterator<[T, T]> {
        for (let ref of this) {
            yield [ref, ref]
        }
    }

    *keys(): IterableIterator<T> {
        yield* this
    }

    [Symbol.iterator]() {
        return this.values()
    }
}

export class StrongWeakSet<T extends { weak_?: boolean }> extends WeakRefSet<T> {
    private _strong = new Set<T>()

    protected _size() {
        return super._size() + this._strong.size
    }

    has(value: T): boolean {
        return value.weak_ ? super.has(value) : this._strong.has(value)
    }

    add(value: T): this {
        if (value.weak_) {
            super.add(value)
        } else {
            this._strong.add(value)
        }
        return this
    }

    clear(): void {
        super.clear()
        this._strong.clear()
    }

    delete(value: T): boolean {
        return value.weak_ ? super.delete(value) : this._strong.delete(value)
    }

    *values(): IterableIterator<T> {
        yield* this._strong.values()
        yield* super.values()
    }
}
