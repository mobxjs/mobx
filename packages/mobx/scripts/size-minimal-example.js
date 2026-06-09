import { action, autorun, computed, observable } from "../dist/mobx.esm.js"

const state = observable({ count: 1 })
const doubled = computed(() => state.count * 2)
const increment = action(() => {
    state.count += 1
})

const dispose = autorun(() => {
    console.log(doubled.get())
})

increment()
dispose()
