import { globalState } from "./globalstate"
import { once, Lambda } from "../utils/utils"

export function isSpyEnabled() {
    return process.env.NODE_ENV !== "production" && !!globalState.spyListeners.length
}

export function spyReport(event) {
    if (process.env.NODE_ENV === "production") return // dead code elimination can do the rest
    if (!globalState.spyListeners.length) return
    const listeners = globalState.spyListeners
    for (let i = 0, l = listeners.length; i < l; i++) listeners[i](event)
}

export function spyReportStart(event) {
    if (process.env.NODE_ENV === "production") return
    const change = { ...event, spyReportStart: true }
    spyReport(change)
}

const END_EVENT = { spyReportEnd: true }

export function spyReportEnd(change?) {
    if (process.env.NODE_ENV === "production") return
    if (change) spyReport({ ...change, spyReportEnd: true })
    else spyReport(END_EVENT)
}

export function spy(listener: (change: any) => void): Lambda {
    if (process.env.NODE_ENV === "production") {
        fail(`[mobx.spy] can not be used in production builds`)
    } else {
        globalState.spyListeners.push(listener)
        return once(() => {
            globalState.spyListeners = globalState.spyListeners.filter(l => l !== listener)
        })
    }
}
