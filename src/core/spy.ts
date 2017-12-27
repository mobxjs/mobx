import { MobxState } from "./mobxstate"
import { objectAssign, once, Lambda } from "./utils"

// TODO: store on mobxstate?
export function isSpyEnabled(context: MobxState) {
    return !!context.spyListeners.length
}

export function spyReport(context: MobxState, event) {
    if (!context.spyListeners.length) return
    const listeners = context.spyListeners
    for (let i = 0, l = listeners.length; i < l; i++) listeners[i](event)
}

export function spyReportStart(context: MobxState, event) {
    const change = objectAssign({}, event, { spyReportStart: true })
    spyReport(context, change)
}

const END_EVENT = { spyReportEnd: true }

export function spyReportEnd(context: MobxState, change?) {
    if (change) spyReport(context, objectAssign({}, change, END_EVENT))
    else spyReport(context, END_EVENT)
}

export function spy(context: MobxState, listener: (change: any) => void): Lambda {
    context.spyListeners.push(listener)
    return once(() => {
        const idx = context.spyListeners.indexOf(listener)
        if (idx !== -1) context.spyListeners.splice(idx, 1)
    })
}
