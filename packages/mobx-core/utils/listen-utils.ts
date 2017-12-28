import { Lambda, once } from "./utils"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { MobxState } from "../core/mobxstate";

export interface IListenable {
    changeListeners: Function[] | null
    observe(handler: (change: any, oldValue?: any) => void, fireImmediately?: boolean): Lambda
}

export function hasListeners(listenable: IListenable) {
    return listenable.changeListeners && listenable.changeListeners.length > 0
}

export function registerListener<T>(listenable: IListenable, handler: Function): Lambda {
    const listeners = listenable.changeListeners || (listenable.changeListeners = [])
    listeners.push(handler)
    return once(() => {
        const idx = listeners.indexOf(handler)
        if (idx !== -1) listeners.splice(idx, 1)
    })
}

export function notifyListeners<T>(context: MobxState, listenable: IListenable, change: T) {
    const prevU = untrackedStart(context)
    let listeners = listenable.changeListeners
    if (!listeners) return
    listeners = listeners.slice()
    for (let i = 0, l = listeners.length; i < l; i++) {
        listeners[i](change)
    }
    untrackedEnd(context, prevU)
}
