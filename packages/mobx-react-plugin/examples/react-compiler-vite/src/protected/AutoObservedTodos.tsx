import { store } from "../store"

export const AutoObservedTodos = () => (
    <dl>
        <dt>todos</dt>
        <dd data-testid="protected-todos">{store.todos.map(todo => todo.title).join(", ")}</dd>
    </dl>
)
