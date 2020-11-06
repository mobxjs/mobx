import { configure } from "mobx"

export function resetMobx(): void {
    configure({ enforceActions: "never" })
}

export function enableDevEnvironment() {
    process.env.NODE_ENV === "development"
    return function () {
        process.env.NODE_ENV === "production"
    }
}

export function sleep(time: number) {
    return new Promise<void>(res => {
        setTimeout(res, time)
    })
}
