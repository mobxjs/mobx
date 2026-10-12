/**
 * @jest-environment node
 */
import { transform, code } from "./utils/transform"
import { isCompiled, functionBody } from "./utils/compiled"
import mobxReactPlugin = require("../src/babel")

const reactCompiler = require.resolve("babel-plugin-react-compiler")

const withCompiler = (source: string, options: mobxReactPlugin.Options | false = {}) =>
    transform(source, { options, plugins: [[reactCompiler, {}]] })

describe("React Compiler integration", () => {
    test("observed components are explicitly left to MobX, other components in the file are compiled", () => {
        const output = withCompiler(code`
import { store } from "./store"
export function Observed() { return <div>{store.count}</div> }
export function Pure({ value }) { "use memo"; return <div>{value}</div> }`)

        expect(output).toContain('import { c as _c } from "react/compiler-runtime"')
        expect(functionBody(output, "function Observed()")).toContain('"use no memo"')
        expect(isCompiled(output, "function Observed()")).toBe(false)
        expect(isCompiled(output, "function Pure(")).toBe(true)
    })

    test("the classic `observer(Component)` pattern is compiled (and goes stale) without the plugin", () => {
        const source = code`
import { observer } from "mobx-react-lite"
import { store } from "./store"
function CounterView() { const count = store.count; return <div>{count}</div> }
export default observer(CounterView)`

        const unprotected = withCompiler(source, false)
        expect(isCompiled(unprotected, "function CounterView()")).toBe(true)

        const protectedOutput = withCompiler(source)
        expect(functionBody(protectedOutput, "function CounterView()")).toContain('"use no memo"')
        expect(isCompiled(protectedOutput, "function CounterView()")).toBe(false)
        expect(protectedOutput).toContain("export default observer(CounterView)")
    })

    test("plugin order matters: React Compiler running first leaves its memo cache inside the observer", () => {
        const source = code`
import { store } from "./store"
export function Counter() { return <div>{store.count}</div> }`

        const wrongOrder = transform(source, {
            options: false,
            plugins: [
                [reactCompiler, {}],
                [mobxReactPlugin, {}]
            ]
        })
        expect(wrongOrder).toContain("observer(function Counter()")
        expect(isCompiled(wrongOrder, "function Counter()")).toBe(true)

        const rightOrder = withCompiler(source)
        expect(rightOrder).toContain("observer(function Counter()")
        expect(isCompiled(rightOrder, "function Counter()")).toBe(false)
    })
})
