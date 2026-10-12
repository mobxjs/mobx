/**
 * @jest-environment node
 */
import * as path from "path"
import generate from "@babel/generator"
import { isCompiled, functionBody } from "./utils/compiled"

const projectRoot = path.join(__dirname, "fixtures", "rn-project")

interface RNOptions {
    dev?: boolean
    hot?: boolean
    hermesParser?: boolean
}

/**
 * Runs a file through React Native's real Metro Babel transformer with the
 * fixture project's babel.config.js (React Native preset + this plugin + React Compiler).
 */
function transformRN(
    filename: string,
    src: string,
    { dev = true, hot = false, hermesParser = false }: RNOptions = {}
) {
    const transformer = require("@react-native/metro-babel-transformer")
    const { ast } = transformer.transform({
        filename,
        src,
        options: {
            projectRoot,
            dev,
            hot,
            platform: "ios",
            hermesParser,
            enableBabelRCLookup: false,
            enableBabelRuntime: false,
            experimentalImportSupport: false,
            unstable_transformProfile: "hermes-stable",
            customTransformOptions: {}
        },
        plugins: []
    })
    return generate(ast).code
}

const APP = `
import React from "react"
import { Text, View } from "react-native"
import { store, useStore } from "./store"

export function App() {
    return <View><Text>{store.count}</Text><TodoList /></View>
}

const TodoList = () => store.todos.map(todo => <Text key={todo.id}>{todo.title}</Text>)

export function useVisibleTodos() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible)
}

export function Pure({ value }) {
    "use memo"
    return <Text>{value}</Text>
}
`

describe("React Native / Metro pipeline (@react-native/metro-babel-transformer + @react-native/babel-preset)", () => {
    test("components are observed and left to MobX, React Compiler compiles the rest", () => {
        const output = transformRN(path.join(projectRoot, "App.tsx"), APP)

        expect(output).toContain('require("mobx-react-lite")')
        expect(output).toMatch(/_mobxReactLite\.observer\)\(function App\(\)/)
        expect(functionBody(output, "function App()")).toContain('"use no memo"')
        expect(isCompiled(output, "function App()")).toBe(false)
        expect(output).toMatch(/_mobxReactLite\.observer\)\(function TodoList\(\)/)
        expect(isCompiled(output, "function TodoList()")).toBe(false)
        expect(functionBody(output, "function useVisibleTodos()")).toContain('"use no memo"')
        expect(isCompiled(output, "function useVisibleTodos()")).toBe(false)

        // React Compiler did run in the same pipeline (after the plugin).
        expect(output).toContain('require("react/compiler-runtime")')
        expect(isCompiled(output, "function Pure(")).toBe(true)
    })

    test("Fast Refresh (dev + hot) registers the observed components", () => {
        const output = transformRN(path.join(projectRoot, "App.tsx"), APP, { dev: true, hot: true })
        expect(output).toMatch(/\$RefreshReg\$\(_c\d*, "App"\)/)
        expect(output).toMatch(/\$RefreshReg\$\(_c\d*, "TodoList"\)/)
    })

    test("production transform", () => {
        const output = transformRN(path.join(projectRoot, "App.tsx"), APP, { dev: false })
        expect(output).toMatch(/_mobxReactLite\.observer\)\(function App\(\)/)
        expect(isCompiled(output, "function App()")).toBe(false)
        expect(isCompiled(output, "function Pure(")).toBe(true)
    })

    test("Flow-typed .js files parsed by hermes-parser", () => {
        const output = transformRN(
            path.join(projectRoot, "Counter.js"),
            `
// @flow
import * as React from "react"
import { Text } from "react-native"
import { store } from "./store"

type Props = { label: string }

export default function Counter(props: Props): React.Node {
    return <Text>{props.label}: {store.count}</Text>
}
`,
            { hermesParser: true }
        )
        expect(output).toMatch(/_mobxReactLite\.observer\)\(function Counter\(props\)/)
        expect(functionBody(output, "function Counter(props)")).toContain('"use no memo"')
        expect(isCompiled(output, "function Counter(props)")).toBe(false)
    })

    test("node_modules are not transformed even though Metro applies the project config to them", () => {
        const output = transformRN(
            path.join(projectRoot, "node_modules", "some-lib", "Button.js"),
            `
import React from "react"
import { Text } from "react-native"
export function Button({ label }) { return <Text>{label}</Text> }
`
        )
        expect(output).not.toContain("mobx-react-lite")
        expect(output).not.toContain('"use no memo"')
    })
})
