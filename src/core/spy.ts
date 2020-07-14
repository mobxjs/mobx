import { Lambda, globalState, once, ISetDidChange, IMapDidChange } from "../internal"

export function isSpyEnabled() {
    return __DEV__ && !!globalState.spyListeners.length
}

export type ObjectSpyEvent = {
    observableKind: "object"
    object: unknown
    name: string
    key: string | number | symbol
} & (
    | {
          type: "add"
          newValue: unknown
      }
    | {
          type: "update"
          newValue: unknown
          oldValue: unknown
      }
    | {
          type: "remove"
          oldValue: unknown
      }
)

export type ArraySpyEvent = {
    observableKind: "array"
    name: string
    index: number
    object: unknown[]
} & (
    | {
          type: "update"
          index: number
          newValue: unknown
          oldValue: unknown
      }
    | {
          type: "splice"
          removed: unknown[]
          added: unknown[]
          removedCount: number
          addedCount: number
      }
)

export type BoxSpyEvent =
    | {
          type: "create"
          observableKind: "box"
          name: string
          newValue: unknown
      }
    | {
          type: "update"
          observableKind: "box"
          name: string
          newValue: unknown
          oldValue: unknown
      }

export type PureSpyEvent =
    | { type: "action"; name: string; object: unknown; arguments: unknown[] }
    | { type: "scheduled-reaction"; name: string }
    | { type: "reaction"; name: string }
    | { type: "compute"; object: unknown; name: string }
    | { type: "error"; name: string; message: string; error: string }
    | ObjectSpyEvent
    | ArraySpyEvent
    | (Omit<IMapDidChange<unknown, unknown>, "name"> & {
          observableKind: "map"
          name: string
          key: unknown
      })
    | (Omit<ISetDidChange<unknown>, "name"> & { observableKind: "set"; name: string })
    | BoxSpyEvent
    | { type: "report-end"; spyReportEnd: true; time?: number }

type SpyEvent = PureSpyEvent & { spyReportStart?: true }

export function spyReport(event: SpyEvent) {
    if (!__DEV__) return // dead code elimination can do the rest
    if (!globalState.spyListeners.length) return
    const listeners = globalState.spyListeners
    for (let i = 0, l = listeners.length; i < l; i++) listeners[i](event)
}

export function spyReportStart(event: PureSpyEvent) {
    if (!__DEV__) return
    const change = { ...event, spyReportStart: true as const }
    spyReport(change)
}

const END_EVENT: SpyEvent = { type: "report-end", spyReportEnd: true }

export function spyReportEnd(change?: { time?: number }) {
    if (!__DEV__) return
    if (change) spyReport({ ...change, type: "report-end", spyReportEnd: true })
    else spyReport(END_EVENT)
}

export function spy(listener: (change: SpyEvent) => void): Lambda {
    if (!__DEV__) {
        console.warn(`[mobx.spy] Is a no-op in production builds`)
        return function () {}
    } else {
        globalState.spyListeners.push(listener)
        return once(() => {
            globalState.spyListeners = globalState.spyListeners.filter(l => l !== listener)
        })
    }
}
