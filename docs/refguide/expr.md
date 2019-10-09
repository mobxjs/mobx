---
sidebar_label: mobxUtils.expr
hide_title: true
---

# Expr

<div id='codefund' ></div>

Provided by the `mobx-utils` package.

`expr` can be used to create temporary computed values inside computed values.
Nesting computed values is useful to create cheap computations in order to prevent expensive computations from needing to run.

In the following example, the expression prevents the `TodoView` component from being re-rendered if the selection changes elsewhere.
Instead, the component will only re-render when the relevant todo is (de)selected, which happens much less frequently.

```javascript
const TodoView = observer(({ todo, editorState }) => {
    const isSelected = mobxUtils.expr(() => editorState.selection === todo)
    return <div className={isSelected ? "todo todo-selected" : "todo"}>{todo.title}</div>
})
```

`expr(func)` is an alias for `computed(func).get()`.

Please note that the function given to `expr` will be evaluated _twice_ in the scenario that the overall expression value changes.
It will be evaluated the first time when any observables it depends on change.
It will be evaluated a second time when a change in its value triggers the outer computed or reaction to evaluate, which will
recreate and reevaluate the expression.
