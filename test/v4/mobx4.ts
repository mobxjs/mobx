import { configure, enableES5 } from "../../src/mobx"

enableES5()
configure({
    useProxies: "never"
})

export * from "../../src/mobx"
