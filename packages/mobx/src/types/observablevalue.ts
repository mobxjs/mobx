import {
    Atom,
    IEnhancer,
    IEqualsComparer,
    checkIfStateModificationsAreAllowed,
    compareDefault,
    createInstanceofPredicate,
    getNextId,
    toPrimitive,
    globalState,
    IUNCHANGED
} from "../internal"

export type IValueDidChange<T = any> = {
    type: "update"
    observableKind: "value"
    object: IObservableValue<T>
    debugObjectName: string
    newValue: T
    oldValue: T | undefined
}
export type IBoxDidChange<T = any> =
    | {
          type: "create"
          observableKind: "value"
          object: IObservableValue<T>
          debugObjectName: string
          newValue: T
      }
    | IValueDidChange<T>

export interface IObservableValue<T> {
    get(): T
    set(value: T): void
}

export class ObservableValue<T> extends Atom implements IObservableValue<T> {
    value_

    constructor(
        value: T,
        public enhancer_: IEnhancer<T>,
        public name_ = __DEV__ ? "ObservableValue@" + getNextId() : "ObservableValue",
        private equals_: IEqualsComparer<any> = compareDefault
    ) {
        super(name_)
        this.value_ = enhancer_(value, undefined, name_)
    }

    public set(newValue: T) {
        newValue = this.prepareNewValue_(newValue) as any
        if (newValue !== globalState.UNCHANGED) {
            this.setNewValue_(newValue)
        }
    }

    private prepareNewValue_(newValue): T | IUNCHANGED {
        checkIfStateModificationsAreAllowed(this)
        // apply modifier
        newValue = this.enhancer_(newValue, this.value_, this.name_)
        return this.equals_(this.value_, newValue) ? globalState.UNCHANGED : newValue
    }

    setNewValue_(newValue: T) {
        this.value_ = newValue
        this.reportChanged()
    }

    public get(): T {
        this.reportObserved()
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
