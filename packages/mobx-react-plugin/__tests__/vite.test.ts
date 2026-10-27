/**
 * @jest-environment node
 */
import mobxReactPlugin = require("../src/vite")
import { isCompiled } from "./utils/compiled"

function createPlugin(options?: mobxReactPlugin.Options) {
    const plugin = mobxReactPlugin(options)
    plugin.configResolved({ root: "/project" })
    return plugin
}

const COMPONENT = `export function App() { return <div>{store.count}</div> }`

describe("Vite plugin", () => {
    test("is a pre-transform", () => {
        const plugin = createPlugin()
        expect(plugin.name).toBe("mobx-react-plugin")
        expect(plugin.enforce).toBe("pre")
    })

    test("transforms tsx and jsx files and provides a source map", async () => {
        const plugin = createPlugin()
        const result = await plugin.transform(COMPONENT, "/project/src/App.tsx?v=123")
        expect(result!.code).toContain('import { observer } from "mobx-react-lite"')
        expect(result!.code).toContain("observer(function App()")
        expect(result!.code).toContain('"use no memo"')
        expect(result!.map).toBeTruthy()
        expect(result!.map!.sources).toEqual(["/project/src/App.tsx"])

        const jsx = await plugin.transform(COMPONENT, "/project/src/App.jsx")
        expect(jsx!.code).toContain("observer(function App()")
    })

    test("node_modules are left alone", async () => {
        const plugin = createPlugin()
        expect(await plugin.transform(COMPONENT, "/project/node_modules/lib/App.tsx")).toBeNull()
    })

    test(".ts files are parsed without JSX (angle bracket assertions keep working)", async () => {
        const plugin = createPlugin()
        const result = await plugin.transform(
            `export function useCount(store) { const s = <any>store; return useSyncExternalStore(s.subscribe, s.get) }`,
            "/project/src/useCount.ts"
        )
        expect(result!.code).toContain('"use no memo"')
    })

    test("modern decorators parse by default, legacy decorators via parserPlugins", async () => {
        const source = `
class Store { @observable accessor count = 0 }
export const App = () => <div />`
        expect((await createPlugin().transform(source, "/project/src/App.tsx"))!.code).toContain(
            "observer(function App()"
        )

        const legacy = createPlugin({ parserPlugins: ["decorators-legacy"] })
        const legacySource = `
class Store { @observable count = 0 }
export const App = () => <div />`
        expect((await legacy.transform(legacySource, "/project/src/App.tsx"))!.code).toContain(
            "observer(function App()"
        )
    })

    test("include / exclude are resolved against the Vite root", async () => {
        const plugin = createPlugin({
            include: ["src/protected/**"],
            exclude: ["src/protected/legacy/**"]
        })
        expect(await plugin.transform(COMPONENT, "/project/src/App.tsx")).toBeNull()
        expect(
            await plugin.transform(COMPONENT, "/project/src/protected/legacy/App.tsx")
        ).toBeNull()
        const result = await plugin.transform(COMPONENT, "/project/src/protected/App.tsx")
        expect(result!.code).toContain("observer(function App()")
    })

    test("plugin options are forwarded", async () => {
        const plugin = createPlugin({ observer: { importSource: "mobx-react", useNoMemo: false } })
        const result = await plugin.transform(COMPONENT, "/project/src/App.tsx")
        expect(result!.code).toContain('import { observer } from "mobx-react"')
        expect(result!.code).not.toContain('"use no memo"')
    })

    test("extra babel plugins run after the transform (e.g. React Compiler)", async () => {
        const plugin = createPlugin({
            babel: { plugins: [[require.resolve("babel-plugin-react-compiler"), {}]] }
        })
        const result = await plugin.transform(
            `${COMPONENT}
export function Pure({ value }) { "use memo"; return <div>{value}</div> }`,
            "/project/src/App.tsx"
        )
        expect(isCompiled(result!.code, "function App()")).toBe(false)
        expect(isCompiled(result!.code, "function Pure(")).toBe(true)
    })

    test("extra babel plugins run even when the MobX transform changes nothing", async () => {
        const plugin = createPlugin({
            babel: { plugins: [[require.resolve("babel-plugin-react-compiler"), {}]] }
        })
        const result = await plugin.transform(
            `export function Pure({ value }) { "use memo"; return <div>{value}</div> }`,
            "/project/src/Pure.tsx"
        )
        expect(isCompiled(result!.code, "function Pure(")).toBe(true)
    })
})
