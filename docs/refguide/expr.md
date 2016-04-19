# Expr

`expr` can be used to create temporarily computed values inside computed values.
Nesting computed values is useful to create cheap computations to prevent expensive computations to run.

In the following example the expression prevents that the `TodoView` component is re-rendered if the selection changes elsewhere.
Instead the component will only re-render when the relevant todo is (de)selected.

```javascript
const TodoView = observer(({todo, editorState}) => {
    const isSelected = mobx.expr(() => editorState.selection === todo);
    return <div className={isSelected ? "todo todo-selected" : "todo"}>{todo.title}</div>;
});
```

`expr(func)` is an alias for `computed(func).get()`.
