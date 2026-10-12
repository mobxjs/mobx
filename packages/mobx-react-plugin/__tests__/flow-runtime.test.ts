/**
 * @jest-environment node
 */
import { transformSync } from "@babel/core"
import { configure, isFlow } from "mobx"
import mobxReactPlugin = require("../src/babel")

function compile(source: string, options: mobxReactPlugin.Options = {}): string {
    return transformSync(source, {
        filename: "/project/src/store.ts",
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        presets: [["@babel/preset-typescript", { allExtensions: true }]],
        plugins: [
            [mobxReactPlugin, options],
            [require.resolve("@babel/plugin-proposal-decorators"), { version: "2023-11" }],
            require.resolve("@babel/plugin-transform-modules-commonjs")
        ]
    })!.code!
}

function load(compiled: string): Record<string, any> {
    const module = { exports: {} as Record<string, any> }
    const req = (id: string) => {
        if (id === "mobx") {
            return require("mobx")
        }
        throw new Error(`Unexpected import: ${id}`)
    }
    new Function("require", "module", "exports", compiled)(req, module, module.exports)
    return module.exports
}

const STORE = `
import { makeAutoObservable } from "mobx"

export class UserStore {
    user: { id: string } | null = null
    status = "idle"

    constructor() {
        makeAutoObservable(this)
    }

    async loadUser(id: string) {
        this.status = "loading"
        const user = await Promise.resolve({ id })
        this.user = user
        this.status = "done"
        return user
    }
}
`

describe("runtime: async methods as flows", () => {
    test("state changes after await are actions, the method still returns a promise", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
        configure({ enforceActions: "always" })

        const { UserStore } = load(compile(STORE))
        const store = new UserStore()
        expect(isFlow(store.loadUser)).toBe(true)

        const promise = store.loadUser("42")
        expect(typeof promise.then).toBe("function")
        expect(typeof promise.cancel).toBe("function")
        expect(store.status).toBe("loading")
        await expect(promise).resolves.toEqual({ id: "42" })
        expect(store.user).toEqual({ id: "42" })
        expect(store.status).toBe("done")
        expect(warn).not.toHaveBeenCalled()
    })

    test("control: without the transform the continuation runs outside an action", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
        configure({ enforceActions: "always" })

        const { UserStore } = load(compile(STORE, { flow: false }))
        const store = new UserStore()
        expect(isFlow(store.loadUser)).toBe(false)
        await store.loadUser("42")
        expect(store.user).toEqual({ id: "42" })
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining(
                "changing (observed) observable values without using an action is not allowed"
            )
        )
    })

    test("modern decorators: @action async becomes @flow", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
        configure({ enforceActions: "always" })

        const { UserStore } = load(
            compile(`
import { action, observable } from "mobx"

export class UserStore {
    @observable accessor user: { id: string } | null = null

    @action async loadUser(id: string) {
        this.user = await Promise.resolve({ id })
        return this.user
    }
}
`)
        )
        const store = new UserStore()
        expect(isFlow(store.loadUser)).toBe(true)
        await expect(store.loadUser("7")).resolves.toEqual({ id: "7" })
        expect(store.user).toEqual({ id: "7" })
        expect(warn).not.toHaveBeenCalled()
    })
})
