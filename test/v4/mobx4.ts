import { configure } from "../../src/mobx"

configure({
    useProxies: "never",
    enforceActions: "never"
})

export * from "../../src/mobx"
