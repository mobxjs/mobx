import { useState } from "react"
import { store } from "./store"
import { AutoObservedCounter } from "./protected/AutoObservedCounter"
import { AutoObservedTodos } from "./protected/AutoObservedTodos"
import { UnsafeManualObserver } from "./controls/UnsafeManualObserver"
import { PureReactComponent } from "./pure/PureReactComponent"

// `src/App.tsx` is outside the transform policy: it is a regular React component
// (compiled by React Compiler) that does not read observables itself.
export function App() {
    const [clicks, setClicks] = useState(0)
    return (
        <main>
            <h1>MobX + React Compiler</h1>
            <button
                onClick={() => {
                    store.mutate()
                    setClicks(n => n + 1)
                }}
            >
                Mutate store
            </button>

            <section>
                <h2>Protected automatic observer</h2>
                <p>
                    <code>src/protected/**</code>: wrapped in <code>observer</code> and marked{" "}
                    <code>"use no memo"</code> by <code>mobx-react-plugin</code>.
                </p>
                <AutoObservedCounter />
                <AutoObservedTodos />
            </section>

            <section className="broken">
                <h2>Unsafe manual observer control</h2>
                <p>
                    <code>src/controls/**</code> is excluded from the transform on purpose:{" "}
                    <code>observer(Component)</code> compiled by React Compiler. Expected to stay
                    stale, demonstrating the problem.
                </p>
                <UnsafeManualObserver />
            </section>

            <section>
                <h2>Pure React component</h2>
                <p>
                    <code>src/pure/**</code> is excluded from the transform and compiled normally by
                    React Compiler.
                </p>
                <PureReactComponent clicks={clicks} />
            </section>
        </main>
    )
}
