import mockConsole, { MockObj } from "jest-mock-console"

export function withConsole(fn: Function): void
export function withConsole(settings: MockObj, fn: Function): void
export function withConsole(props: Array<ConsoleProps>, fn: Function): void

export function withConsole(...args: Array<any>): void {
    let settings
    let fn
    if (typeof args[0] === "function") {
        fn = args[0]
    } else if (Array.isArray(args[0]) || typeof args[0] === "object") {
        settings = args[0]

        if (typeof args[1] === "function") {
            fn = args[1]
        }
    }
    const restoreConsole = mockConsole(settings)
    fn && fn()
    restoreConsole()
}
