/**
 * @jest-environment node
 */
import { transform, code } from "./utils/transform"
import { isCompiled, functionBody } from "./utils/compiled"
import mobxReactPlugin = require("../src/babel")

const reactCompiler = require.resolve("babel-plugin-react-compiler")

const withCompiler = (source: string, options: mobxReactPlugin.Options | false = {}) =>
    transform(source, { options, plugins: [[reactCompiler, {}]] })

describe("React Compiler integration (babel-plugin-react-compiler 1.0.0, default options)", () => {
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

    test("inline observer callbacks are currently skipped by inference only; the plugin makes the opt-out explicit", () => {
        const source = code`
import { observer } from "mobx-react-lite"
import { store } from "./store"
export const Inline = observer(function Inline() { return <div>{store.count}</div> })
export const Banana = banana(function Banana() { return <div>{store.count}</div> })`

        const unprotected = withCompiler(source, false)
        // Not MobX awareness: any unknown HOC callback is skipped the same way.
        expect(isCompiled(unprotected, "function Inline()")).toBe(false)
        expect(isCompiled(unprotected, "function Banana()")).toBe(false)
        expect(unprotected).not.toContain('"use no memo"')

        const protectedOutput = withCompiler(source)
        expect(functionBody(protectedOutput, "function Inline()")).toContain('"use no memo"')
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

    test("custom hooks are protected by default", () => {
        const source = code`
import { useStore } from "./store"
export function useVisibleTodos() { const store = useStore(); return store.todos.filter(todo => todo.visible) }
export function List() { const todos = useVisibleTodos(); return <ul>{todos.map(t => <li key={t.id}>{t.title}</li>)}</ul> }`

        const output = withCompiler(source)
        expect(isCompiled(output, "function useVisibleTodos()")).toBe(false)
        expect(functionBody(output, "function useVisibleTodos()")).toContain('"use no memo"')

        const hooksCompiled = withCompiler(source, { observer: { useNoMemoHooks: false } })
        expect(isCompiled(hooksCompiled, "function useVisibleTodos()")).toBe(true)
        expect(isCompiled(hooksCompiled, "function List()")).toBe(false)
    })

    test("forwardRef callbacks", () => {
        const output = withCompiler(code`
import { forwardRef } from "react"
import { store } from "./store"
export const Input = forwardRef((props, ref) => <input ref={ref} value={store.firstName} readOnly />)`)
        expect(output).toContain("observer(forwardRef(function Input(props, ref)")
        expect(isCompiled(output, "function Input(props, ref)")).toBe(false)
    })
})
