import { configure } from "../../src/mobx"

configure({
    useProxies: "never"
})

export * from "../../src/mobx"
