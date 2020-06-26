---
sidebar_label: makeAutoObservable
hide_title: true
---

# makeAutoObservable

```javascript
import { makeAutoObservable } from "mobx"

class Todo {
    id = Math.random()
    title = ""
    finished = false

    constructor() {
        makeAutoObservable(this, { id: false })
    }

    toggle() {
        this.finished = !finished
    }
}

class TodoList {
    todos = []
    get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length
    }
    constructor() {
        makeAutoObservable(this)
    }
}
```

As you can see this is more compact; the only thing you need to do to make instances of a class become observable is `makeAutoObservable`. In our original `Todo` class `id` was not observable, and we've specified the same behavior here by telling `makeAutoObservable` not to do anything with it.
