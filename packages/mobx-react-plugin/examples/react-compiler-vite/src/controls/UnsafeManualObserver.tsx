import { observer } from "mobx-react-lite"
import { store } from "../store"

// INTENTIONALLY BROKEN CONTROL. This directory is excluded from mobx-react-plugin, so
// React Compiler compiles `CounterView` and caches its JSX. MobX re-renders the component
// after every mutation, but the cached JSX is returned and the DOM stays stale.
// See https://github.com/facebook/react/issues/37000
function CounterView() {
    const count = store.count
    return (
        <dl>
            <dt>count (expected to stay stale)</dt>
            <dd data-testid="control-count">{count}</dd>
        </dl>
    )
}

export const UnsafeManualObserver = observer(CounterView)
