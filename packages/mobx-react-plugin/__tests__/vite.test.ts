import mobxReactPlugin = require("../src/vite")

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
        expect(result!.code).toContain('import { observer } from "mobx-react-plugin/observer"')
        expect(result!.code).toContain("observer(function App()")
        expect(result!.code).toContain('"use no memo"')
        expect(result!.map).toBeTruthy()
        expect(result!.map!.sources).toEqual(["/project/src/App.tsx"])

        const jsx = await plugin.transform(COMPONENT, "/project/src/App.jsx")
        expect(jsx!.code).toContain("observer(function App()")
    })

    test("node_modules and non-JS files are left alone", async () => {
        const plugin = createPlugin()
        expect(await plugin.transform(COMPONENT, "/project/node_modules/lib/App.tsx")).toBeNull()
        expect(await plugin.transform("a { color: red }", "/project/src/App.css")).toBeNull()
    })

    test(".ts files are parsed without JSX (angle bracket assertions keep working)", async () => {
        const plugin = createPlugin()
        const result = await plugin.transform(
            `export function useCount(store) { const s = <any>store; return useSyncExternalStore(s.subscribe, s.get) }`,
            "/project/src/useCount.ts"
        )
        expect(result!.code).toContain('"use no memo"')
    })

    test("decorators parse", async () => {
        const source = `
class Store { @observable accessor count = 0 }
export const App = () => <div />`
        expect((await createPlugin().transform(source, "/project/src/App.tsx"))!.code).toContain(
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
        const plugin = createPlugin({ observer: { useNoMemo: false } })
        const result = await plugin.transform(COMPONENT, "/project/src/App.tsx")
        expect(result!.code).not.toContain('"use no memo"')
    })

    test("extra babel plugins run even when the MobX transform changes nothing", async () => {
        const plugin = createPlugin({
            babel: { plugins: [[require.resolve("babel-plugin-react-compiler"), {}]] }
        })
        const result = await plugin.transform(
            `export function Pure({ value }) { "use memo"; return <div>{value}</div> }`,
            "/project/src/Pure.tsx"
        )
        expect(result!.code).toContain("react/compiler-runtime")
    })
})
