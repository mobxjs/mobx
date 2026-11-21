import { render } from "@testing-library/react"
import * as React from "react"
import gc from "expose-gc/function"
import { observer } from "../src"

function nextFrame() {
    return new Promise(accept => setTimeout(accept, 1))
}

async function gc_cycle() {
    await nextFrame()
    gc()
    await nextFrame()
}

// If `subscribe` shares a closure context with the `reaction.track` callback,
// the first render's result stays reachable for as long as the component is mounted.
// See the comment on `createObserverAdministration` in src/useObserver.ts.
test("a mounted observer does not retain the element tree it first returned", async () => {
    let capturedFirstTree: object | null = null

    const TestComponent = observer(function TestComponent({ label }: { label: string }) {
        const tree = <div data-label={label} />
        if (!capturedFirstTree) {
            capturedFirstTree = tree
        }
        return tree
    })

    const rendering = render(<TestComponent label="first" />)

    const weakFirstTree = new WeakRef(capturedFirstTree!)
    capturedFirstTree = null

    // Several re-renders rather than one: React double-buffers fibers, so the
    // `alternate` fiber legitimately keeps the immediately-previous render's
    // tree alive for one extra commit. Distinct props are required because
    // `observer` wraps the component in `React.memo`.
    rendering.rerender(<TestComponent label="second" />)
    rendering.rerender(<TestComponent label="third" />)
    rendering.rerender(<TestComponent label="fourth" />)

    await gc_cycle()

    expect(weakFirstTree.deref()).toBeUndefined()
})

// There is deliberately no assertion that the first render's `props` become
// collectable: a control component wrapped in plain `React.memo` (no MobX involved)
// fails such an assertion too, so it cannot isolate MobX's contribution.
