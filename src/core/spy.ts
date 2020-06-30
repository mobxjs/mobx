import { Lambda, globalState, once, ISetDidChange, IMapDidChange } from "../internal"

export function isSpyEnabled() {
    return __DEV__ && !!globalState.spyListeners.length
}

export type ArraySpyEvent =
    | {
          type: "update"
          observableKind: "array"
          name: string
          object: unknown
          index: number
          newValue: unknown
          oldValue: unknown
      }
    | {
          type: "splice"
          observableKind: "array"
          name: string
          object: unknown
          index: number
          removed: unknown[]
          added: unknown[]
          removedCount: number
          addedCount: number
      }
export type ObjectSpyEvent =
    | {
          type: "add"
          observableKind: "object"
          name: string
          key: string | number | symbol
          newValue: unknown
      }
    | {
          type: "remove"
          observableKind: "object"
          name: string
          key: string | number | symbol
          oldValue: unknown
      }
    | {
          type: "update"
          observableKind: "object"
          key: string | number | symbol
          name: string
          object: unknown
          newValue: unknown
          oldValue: unknown
      }
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
    | { type: "scheduled-reaction"; name: string }
    | { type: "reaction"; name: string }
    | { type: "compute"; name: string }
    | { type: "error"; name: string; message: string; error: string }
    | { type: "action"; name: string; object: unknown; arguments: unknown[] }
    | ObjectSpyEvent
    | ArraySpyEvent
    | BoxSpyEvent
    | (Omit<IMapDidChange<unknown, unknown>, "name"> & { name: string; key: unknown })
    | (Omit<ISetDidChange<unknown>, "name"> & { name: string })
    | { type: "compute"; object: unknown; name: string }
    | { type: "report-end-only" }

type SpyEvent = PureSpyEvent & { spyReportStart?: true; spyReportEnd?: true }

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

const END_EVENT: SpyEvent = { spyReportEnd: true, type: "report-end-only" }

export function spyReportEnd(change?) {
    if (!__DEV__) return
    if (change) spyReport({ ...change, spyReportEnd: true })
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
