import { BaseAtom } from "./atom"
import { checkIfStateModificationsAreAllowed } from "./derivation"
import {
    Lambda,
    createInstanceofPredicate,
    primitiveSymbol,
    toPrimitive
} from "./utils"
import {
    hasInterceptors,
    IInterceptable,
    IInterceptor,
    registerInterceptor,
    interceptChange
} from "./intercept-utils"
import { IListenable, registerListener, hasListeners, notifyListeners } from "./listen-utils"
import { isSpyEnabled, spyReportStart, spyReportEnd, spyReport } from "../core/spy"
import { MobxState } from "./mobxstate";

export interface IValueWillChange<T> {
    object: any
    type: "update"
    newValue: T
}

export interface IValueDidChange<T> extends IValueWillChange<T> {
    oldValue: T | undefined
}

export type IUNCHANGED = {}

export const UNCHANGED: IUNCHANGED = {}

export interface IObservableValue<T> {
    get(): T
    set(value: T): void
    intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda
    observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda
}

declare var Symbol

export class ObservableValue<T> extends BaseAtom
    implements IObservableValue<T>, IInterceptable<IValueWillChange<T>>, IListenable {
    hasUnreportedChange = false
    interceptors
    changeListeners
    protected value
    dehancer: any = undefined

    constructor(
        context: MobxState,
        value: T,
        protected enhancer: (newValue: T, oldValue: T | undefined, name: string) => T,
        name = "ObservableValue@" + context.nextId(),
        notifySpy = true
    ) {
        super(context, name)
        this.value = enhancer(value, undefined, name)
        if (notifySpy && isSpyEnabled(context)) {
            // only notify spy if this is a stand-alone observable
            spyReport(context, { type: "create", object: this, newValue: this.value })
        }
    }

    private dehanceValue(value: T): T {
        if (this.dehancer !== undefined) return this.dehancer(value)
        return value
    }

    public set(newValue: T) {
        const oldValue = this.value
        newValue = this.prepareNewValue(newValue) as any
        if (newValue !== UNCHANGED) {
            const notifySpy = isSpyEnabled(this.context)
            if (notifySpy) {
                spyReportStart(this.context, {
                    type: "update",
                    object: this,
                    newValue,
                    oldValue
                })
            }
            this.setNewValue(newValue)
            if (notifySpy) spyReportEnd(this.context)
        }
    }

    private prepareNewValue(newValue): T | IUNCHANGED {
        checkIfStateModificationsAreAllowed(this)
        if (hasInterceptors(this)) {
            const change = interceptChange<IValueWillChange<T>>(this.context, this, {
                object: this,
                type: "update",
                newValue
            })
            if (!change) return UNCHANGED
            newValue = change.newValue
        }
        // apply modifier
        newValue = this.enhancer(newValue, this.value, this.name)
        return this.value !== newValue ? newValue : UNCHANGED
    }

    setNewValue(newValue: T) {
        const oldValue = this.value
        this.value = newValue
        this.reportChanged()
        if (hasListeners(this)) {
            notifyListeners(this.context, this, {
                type: "update",
                object: this,
                newValue,
                oldValue
            })
        }
    }

    public get(): T {
        this.reportObserved()
        return this.dehanceValue(this.value)
    }

    public intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda {
        return registerInterceptor(this, handler)
    }

    public observe(
        listener: (change: IValueDidChange<T>) => void,
        fireImmediately?: boolean
    ): Lambda {
        if (fireImmediately)
            listener({
                object: this,
                type: "update",
                newValue: this.value,
                oldValue: undefined
            })
        return registerListener(this, listener)
    }

    toJSON() {
        return this.get()
    }

    toString() {
        return `${this.name}[${this.value}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }
}

ObservableValue.prototype[primitiveSymbol()] = ObservableValue.prototype.valueOf

export var isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue) as (
    x: any
) => x is IObservableValue<any>
