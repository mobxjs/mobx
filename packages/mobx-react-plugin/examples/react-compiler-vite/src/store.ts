import { makeAutoObservable } from "mobx"

export class DemoStore {
    count = 0
    todos = [{ id: 1, title: "A" }]
    firstName = "A"

    constructor() {
        makeAutoObservable(this)
    }

    mutate() {
        this.count++
        this.firstName = "B"
        this.todos.push({ id: this.todos.length + 1, title: "B" })
    }

    formattedName() {
        return `${this.firstName}!`
    }
}

export const store = new DemoStore()
