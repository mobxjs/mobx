import React from "react"
import { act, render } from "@testing-library/react"
import { action, observable } from "mobx"
import { observer } from "../src"

test("React batches independent observer updates without a custom reaction scheduler", async () => {
    const store = observable({ a: 0, b: 0 })
    const renders: string[] = []
    let commits = 0

    const A = observer(() => {
        renders.push(`A:${store.a}`)
        return <span>{store.a}</span>
    })
    const B = observer(() => {
        renders.push(`B:${store.b}`)
        return <span>{store.b}</span>
    })
    const App = () => (
        <React.Profiler id="batching" onRender={() => commits++}>
            <A />
            <B />
        </React.Profiler>
    )

    render(<App />)

    const commitsBeforeUpdate = commits
    const rendersBeforeUpdate = renders.length

    await act(async () => {
        await new Promise<void>(resolve =>
            setTimeout(
                action(() => {
                    store.a++
                    store.b++
                    resolve()
                }),
                0
            )
        )
    })

    expect(commits - commitsBeforeUpdate).toBe(1)
    expect(renders.slice(rendersBeforeUpdate)).toEqual(["A:1", "B:1"])
})
