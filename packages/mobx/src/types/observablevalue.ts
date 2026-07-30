import {
    Atom,
    IEnhancer,
    IInterceptable,
    IEqualsComparer,
    IListenable,
    checkIfStateModificationsAreAllowed,
    compareDefault,
    createInstanceofPredicate,
    getNextId,
    hasInterceptors,
    hasListeners,
    interceptChange,
    notifyListeners,
    toPrimitive,
    globalState,
    IUNCHANGED,
    UPDATE
} from "../internal"

export interface IValueWillChange<T> {
    object: IObservableValue<T>
    type: "update"
    newValue: T
}

export type IValueDidChange<T = any> = {
    type: "update"
    observableKind: "value"
    object: IObservableValue<T>
    debugObjectName: string
    newValue: T
    oldValue: T | undefined
}
export interface IObservableValue<T> {
    get(): T
    set(value: T): void
}

export class ObservableValue<T>
    extends Atom
    implements IObservableValue<T>, IInterceptable<IValueWillChange<T>>, IListenable
{
    hasUnreportedChange_ = false
    interceptors_
    changeListeners_
    value_
    dehancer: any

    constructor(
        value: T,
        public enhancer_: IEnhancer<T>,
        public name_ = __DEV__ ? "ObservableValue@" + getNextId() : "ObservableValue",
        private equals_: IEqualsComparer<any> = compareDefault
    ) {
        super(name_)
        this.value_ = enhancer_(value, undefined, name_)
    }

    private dehanceValue(value: T): T {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    public set(newValue: T) {
        newValue = this.prepareNewValue_(newValue) as any
        if (newValue !== globalState.UNCHANGED) {
            this.setNewValue_(newValue)
        }
    }

    private prepareNewValue_(newValue): T | IUNCHANGED {
        checkIfStateModificationsAreAllowed(this)
        if (hasInterceptors(this)) {
            const change = interceptChange<IValueWillChange<T>>(this, {
                object: this,
                type: UPDATE,
                newValue
            })
            if (!change) {
                return globalState.UNCHANGED
            }
            newValue = change.newValue
        }
        // apply modifier
        newValue = this.enhancer_(newValue, this.value_, this.name_)
        return this.equals_(this.value_, newValue) ? globalState.UNCHANGED : newValue
    }

    setNewValue_(newValue: T) {
        const oldValue = this.value_
        this.value_ = newValue
        this.reportChanged()
        if (hasListeners(this)) {
            notifyListeners(this, {
                type: UPDATE,
                object: this,
                newValue,
                oldValue
            })
        }
    }

    public get(): T {
        this.reportObserved()
        return this.dehanceValue(this.value_)
    }

    raw() {
        // used by MST ot get undehanced value
        return this.value_
    }

    toJSON() {
        return this.get()
    }

    toString() {
        return `${this.name_}[${this.value_}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
    }
}

export const isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue) as (
    x: any
) => x is IObservableValue<any>
