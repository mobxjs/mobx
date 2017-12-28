import { BaseAtom } from "./atom"
import { checkIfStateModificationsAreAllowed } from "./derivation"
import {
    Lambda,
    createInstanceofPredicate,
    primitiveSymbol,
    toPrimitive
} from "../utils/utils"
import {
    hasInterceptors,
    IInterceptable,
    IInterceptor,
    registerInterceptor,
    interceptChange
} from "../utils/intercept-utils"
import { IListenable, registerListener, hasListeners, notifyListeners } from "../utils/listen-utils"
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

declare var Symbol: any

class ObservableValue<T> extends BaseAtom implements IObservableValue<T>, IInterceptable<IValueWillChange<T>>, IListenable {
    hasUnreportedChange = false
    interceptors: IInterceptor<IValueWillChange<T>>[] | null
    changeListeners: Function[] | null
    protected value: T
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
        if (notifySpy && context.isSpyEnabled()) {
            // only notify spy if this is a stand-alone observable
            context.spyReport({ type: "create", object: this, newValue: this.value })
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
            const { context } = this;
            const notifySpy = context.isSpyEnabled()
            if (notifySpy) {
                context.spyReportStart({
                    type: "update",
                    object: this,
                    newValue,
                    oldValue
                })
            }
            this.setNewValue(newValue)
            if (notifySpy) context.spyReportEnd()
        }
    }

    private prepareNewValue(newValue: T): T | IUNCHANGED {
        checkIfStateModificationsAreAllowed(this)
        if (hasInterceptors(this)) {
            const change = interceptChange<IValueWillChange<T>>(this.context, this as any, {
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
        return toPrimitive(this.get() as any) as any
    }
}

;(ObservableValue as any).prototype[primitiveSymbol()] = ObservableValue.prototype.valueOf

export var isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue) as (
    x: any
) => x is IObservableValue<any>

export function cell<T>(
    context: MobxState,
    name = "ObservableValue@" + context.nextId(),
    value: T,
    enhancer: (newValue: T, oldValue: T | undefined, name: string) => T,
    notifySpy = true
): IObservableValue<T> {
    return new ObservableValue(context, value, enhancer, name, notifySpy);
}