import { observable } from "mobx"
import { Component } from "react"

if (!Component) {
    throw new Error("mobx-react requires React to be available")
}

if (!observable) {
    throw new Error("mobx-react requires mobx to be available")
}

export {
    Observer,
    isUsingStaticRendering,
    enableStaticRendering,
    useLocalObservable,
    _observerFinalizationRegistry,
    clearTimers
} from "mobx-react-lite"

export { observer } from "./observer"
