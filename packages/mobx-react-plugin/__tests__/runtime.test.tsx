import * as React from "react"
import { act, render, screen } from "@testing-library/react"
import { transformSync } from "@babel/core"
import mobxReactPlugin = require("../src/babel")

interface CompileOptions {
    plugin?: mobxReactPlugin.Options | false
    compiler?: boolean
}

/** Compiles a module the way a React 19 + React Compiler app would, down to CommonJS. */
function compile(source: string, { plugin = {}, compiler = true }: CompileOptions = {}): string {
    return transformSync(source, {
        filename: "/project/src/Test.tsx",
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        presets: [
            ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
            ["@babel/preset-react", { runtime: "automatic" }]
        ],
        plugins: [
            ...(plugin === false ? [] : [[mobxReactPlugin, plugin]]),
            ...(compiler ? [[require.resolve("babel-plugin-react-compiler"), {}]] : []),
            require.resolve("@babel/plugin-transform-modules-commonjs")
        ]
    })!.code!
}

function load(compiled: string): Record<string, any> {
    const module = { exports: {} as Record<string, any> }
    const req = (id: string) => {
        switch (id) {
            case "react":
                return require("react")
            case "react/jsx-runtime":
                return require("react/jsx-runtime")
            case "react/compiler-runtime":
                return require("react/compiler-runtime")
            case "mobx":
                return require("mobx")
            case "mobx-react-lite":
                return require("mobx-react-lite")
            default:
                throw new Error(`Unexpected import: ${id}`)
        }
    }
    new Function("require", "module", "exports", compiled)(req, module, module.exports)
    return module.exports
}

const STORE = `
import { makeAutoObservable } from "mobx"
class DemoStore {
    count = 0
    todos = [{ id: 1, title: "A", visible: true }]
    firstName = "A"
    constructor() { makeAutoObservable(this) }
    mutate() {
        this.count++
        this.firstName = this.firstName + "B"
        this.todos.push({ id: this.todos.length + 1, title: "B", visible: true })
    }
    formattedName() { return this.firstName + "!" }
}
export const store = new DemoStore()
`

describe("runtime: MobX + React Compiler + StrictMode", () => {
    test("automatically observed components keep updating (primitive, method, observable array)", () => {
        const compiled = compile(`
${STORE}
import { StrictMode } from "react"
export function CounterView() { return <div data-testid="count">{store.count}</div> }
export const NameView = () => <div data-testid="name">{store.formattedName()}</div>
export function TodosView() {
    return <ul data-testid="todos">{store.todos.map(todo => <li key={todo.id}>{todo.title}</li>)}</ul>
}
export default function App() {
    return <StrictMode><CounterView /><NameView /><TodosView /></StrictMode>
}`)
        const exports = load(compiled)
        render(React.createElement(exports.default))
        expect(screen.getByTestId("count").textContent).toBe("0")
        expect(screen.getByTestId("name").textContent).toBe("A!")
        expect(screen.getByTestId("todos").textContent).toBe("A")

        act(() => {
            exports.store.mutate()
            exports.store.mutate()
            exports.store.mutate()
        })
        expect(screen.getByTestId("count").textContent).toBe("3")
        expect(screen.getByTestId("name").textContent).toBe("ABBB!")
        expect(screen.getByTestId("todos").textContent).toBe("ABBB")
    })

    test("control: `observer(Component)` declared separately goes stale without the plugin, works with it", () => {
        const source = `
${STORE}
import { observer } from "mobx-react-lite"
function CounterView() {
    const count = store.count
    return <div data-testid="count">{count}</div>
}
export default observer(CounterView)`

        const withoutPlugin = load(compile(source, { plugin: false }))
        const { unmount } = render(React.createElement(withoutPlugin.default))
        act(() => withoutPlugin.store.mutate())
        // The compiler cached the JSX, so the observer re-rendered but showed the old output.
        expect(screen.getByTestId("count").textContent).toBe("0")
        unmount()

        const withPlugin = load(compile(source))
        render(React.createElement(withPlugin.default))
        act(() => withPlugin.store.mutate())
        expect(screen.getByTestId("count").textContent).toBe("1")
    })

    test("recursive components render the observed component for the recursion", () => {
        const exports = load(
            compile(`
import { makeAutoObservable } from "mobx"
class TreeNode {
    title: string
    children: TreeNode[] = []
    constructor(title: string) { this.title = title; makeAutoObservable(this) }
}
export const root = new TreeNode("root")
export const child = new TreeNode("child")
root.children.push(child)
export function Tree({ node }: { node: TreeNode }) {
    return (
        <li>
            <span>{node.title}</span>
            {node.children.length > 0 && <ul>{node.children.map((c, i) => <Tree key={i} node={c} />)}</ul>}
        </li>
    )
}`)
        )
        render(<ul>{React.createElement(exports.Tree, { node: exports.root })}</ul>)
        expect(screen.getByText("child")).toBeTruthy()
        act(() => {
            exports.child.title = "child (changed)"
        })
        expect(screen.getByText("child (changed)")).toBeTruthy()
    })

    test("manual observer(function TodoItem() {}) pattern from mobxjs/mobx#3836 stays reactive", () => {
        const exports = load(
            compile(`
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react-lite"
class Item {
    text: string
    children: Item[] = []
    constructor(text: string) { this.text = text; makeAutoObservable(this) }
}
export const root = new Item("root")
export const child = new Item("child")
root.children.push(child)
export const TodoItem = observer(function TodoItem({ item }: { item: Item }) {
    return (
        <div>
            <div>{item.text}</div>
            {item.children.map((childItem, i) => <TodoItem key={i} item={childItem} />)}
        </div>
    )
})`)
        )
        render(React.createElement(exports.TodoItem, { item: exports.root }))
        expect(screen.getByText("child")).toBeTruthy()
        act(() => {
            exports.child.text = "child (changed)"
        })
        expect(screen.getByText("child (changed)")).toBeTruthy()
    })

    test("custom hooks reading observables: protected by default, stale when useNoMemoHooks is off", () => {
        const source = `
${STORE}
import { createContext, useContext } from "react"
const StoreContext = createContext(store)
function useStore() { return useContext(StoreContext) }
function useVisibleTitles() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible).map(todo => todo.title).join(",")
}
export function Visible() { return <div data-testid="visible">{useVisibleTitles()}</div> }`

        const safe = load(compile(source))
        const { unmount } = render(React.createElement(safe.Visible))
        expect(screen.getByTestId("visible").textContent).toBe("A")
        act(() => safe.store.mutate())
        expect(screen.getByTestId("visible").textContent).toBe("A,B")
        unmount()

        const unsafe = load(compile(source, { plugin: { observer: { useNoMemoHooks: false } } }))
        render(React.createElement(unsafe.Visible))
        expect(screen.getByTestId("visible").textContent).toBe("A")
        act(() => unsafe.store.mutate())
        // The compiled hook cached its result against the stable `store.todos` identity.
        expect(screen.getByTestId("visible").textContent).toBe("A")
    })

    test("forwardRef components", () => {
        const exports = load(
            compile(`
${STORE}
import { forwardRef } from "react"
export const Input = forwardRef<HTMLInputElement>((props, ref) => (
    <input ref={ref} data-testid="input" value={store.firstName} readOnly />
))`)
        )
        const ref = React.createRef<HTMLInputElement>()
        render(React.createElement(exports.Input, { ref }))
        expect(ref.current).toBeInstanceOf(HTMLInputElement)
        expect(ref.current!.value).toBe("A")
        act(() => exports.store.mutate())
        expect(ref.current!.value).toBe("AB")
    })

    test('a "use memo" component in the same file is compiled by React Compiler and still works', () => {
        const compiled = compile(`
export function Pure({ value }: { value: number }) {
    "use memo"
    return <div data-testid="pure">{value * 2}</div>
}`)
        const exports = load(compiled)
        const { rerender } = render(React.createElement(exports.Pure, { value: 1 }))
        expect(screen.getByTestId("pure").textContent).toBe("2")
        rerender(React.createElement(exports.Pure, { value: 5 }))
        expect(screen.getByTestId("pure").textContent).toBe("10")
    })
})
