import "@testing-library/jest-dom/extend-expect"
import { configure } from "mobx"

configure({ enforceActions: "never" })

// @ts-ignore
global.__DEV__ = true

// Uglyness to find missing 'act' more easily
// 14-2-19 / React 16.8.1, temporarily work around, as error message misses a stack-trace
Error.stackTraceLimit = Infinity
const origError = console.error
console.error = function (msg) {
    if (/react-wrap-tests-with-act/.test("" + msg)) throw new Error("missing act")
    return origError.apply(this, arguments as any)
}
