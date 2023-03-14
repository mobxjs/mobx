import "@testing-library/jest-dom/extend-expect"
import { configure } from "mobx"

global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

configure({ enforceActions: "never" })

// @ts-ignore
global.__DEV__ = true
