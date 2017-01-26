# Writing Actions

Writing actions is straight-forward when using MobX.
Just create, change or delete data and MobX will make sure that changes are picked up by the store and the components that depend on your data.
Based on the store we have created in the previous section, actions become as simple as:

```javascript
var todo = todoStore.createTodo();
todo.task = "make coffee";
```

That is enough to create a todo, submit it to the server and update our user interface accordingly.

## When to use actions?

Actions should only be used on functions that _modify_ state.
Functions that just perform look-ups, filters etc should _not_ be marked as actions; to allow MobX to track their invocations.

## Asynchronous actions

Writing asynchronous actions is pretty simple as well.
You can use observable data structures as a promise.
This is what happens with the `isLoading` property in the `todoStore` for example:

```javascript
// ...
	this.isLoading = true;
	this.transportLayer.fetchTodos().then(fetchedTodos => {
		fetchedTodos.forEach(json => this.updateTodoFromServer(json));
		this.isLoading = false;
	});
// ...
```

After completing the asynchronous action, just update your data and your views will update.
The render function of a React component could become as simple as:

```javascript
import {observer} from "mobx-react";

var TodoOverview = observer(function(props) {
	var todoStore = props.todoStore;
	if (todoStore.isLoading) {
		return <div>Loading...</div>;
	} else {
		return <div>{
			todoStore.todos.map(todo => <TodoItem key={todo.id} todo={todo} />)
		}</div>
	}
});
```

The above `TodoOverview` component will now update whenever `isLoading` changes, or when `isLoading` is true and the `todos` list changes.
Note that we could have expressed `todoStore.isLoading` as `todoStore.todos.length` as well.
The result would be exactly the same.
