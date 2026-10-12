import { store } from "../store"

// No `observer`, no directive: both are added by mobx-react-plugin.
export function AutoObservedCounter() {
    return (
        <dl>
            <dt>count</dt>
            <dd data-testid="protected-count">{store.count}</dd>
            <dt>name</dt>
            <dd data-testid="protected-name">{store.formattedName()}</dd>
        </dl>
    )
}
