import React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { observable, runInAction } from "mobx"

import { observer } from "../src"

afterEach(cleanup)

test("observer function component reacts to observable values from React context", () => {
    const store = observable({ count: 0 })
    const StoreContext = React.createContext(store)
    let renderCount = 0

    const Counter = observer(function Counter() {
        renderCount++
        const contextStore = React.useContext(StoreContext)
        return <span>{contextStore.count}</span>
    })

    const { container } = render(
        <StoreContext.Provider value={store}>
            <Counter />
        </StoreContext.Provider>
    )

    expect(container.textContent).toBe("0")
    expect(renderCount).toBe(1)

    act(() => {
        runInAction(() => {
            store.count++
        })
    })

    expect(container.textContent).toBe("1")
    expect(renderCount).toBe(2)
})

test("observer class component reacts to observable values from contextType", () => {
    const store = observable({ count: 0 })
    const StoreContext = React.createContext(store)
    let renderCount = 0

    class Counter extends React.Component {
        static contextType = StoreContext

        render() {
            renderCount++
            const contextStore = this.context as { count: number }
            return <span>{contextStore.count}</span>
        }
    }

    const ObservedCounter = observer(Counter)

    const { container } = render(
        <StoreContext.Provider value={store}>
            <ObservedCounter />
        </StoreContext.Provider>
    )

    expect(container.textContent).toBe("0")
    expect(renderCount).toBe(1)

    act(() => {
        runInAction(() => {
            store.count++
        })
    })

    expect(container.textContent).toBe("1")
    expect(renderCount).toBe(2)
})
