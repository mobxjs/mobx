import * as React from "react"
import { observer as observerLite, Observer } from "mobx-react-lite"

import { makeClassComponentObserver } from "./observerClass"
import { IReactComponent } from "./types/IReactComponent"

const hasSymbol = typeof Symbol === "function" && Symbol.for

// Using react-is had some issues (and operates on elements, not on types), see #608 / #609
const ReactForwardRefSymbol = hasSymbol
    ? Symbol.for("react.forward_ref")
    : typeof React.forwardRef === "function" && React.forwardRef((props: any) => null)["$$typeof"]

const ReactMemoSymbol = hasSymbol
    ? Symbol.for("react.memo")
    : typeof React.memo === "function" && React.memo((props: any) => null)["$$typeof"]

/**
 * Observer function / decorator
 */
export function observer<T extends IReactComponent>(component: T): T {
    if (component["isMobxInjector"] === true) {
        console.warn(
            "Mobx observer: You are trying to use 'observer' on a component that already has 'inject'. Please apply 'observer' before applying 'inject'"
        )
    }

    if (ReactMemoSymbol && component["$$typeof"] === ReactMemoSymbol) {
        throw new Error(
            "Mobx observer: You are trying to use 'observer' on a function component wrapped in either another observer or 'React.memo'. The observer already applies 'React.memo' for you."
        )
    }

    // Unwrap forward refs into `<Observer>` component
    // we need to unwrap the render, because it is the inner render that needs to be tracked,
    // not the ForwardRef HoC
    if (ReactForwardRefSymbol && component["$$typeof"] === ReactForwardRefSymbol) {
        const baseRender = component["render"]
        if (typeof baseRender !== "function")
            throw new Error("render property of ForwardRef was not a function")
        return React.forwardRef(function ObserverForwardRef() {
            const args = arguments
            return <Observer>{() => baseRender.apply(undefined, args)}</Observer>
        }) as T
    }

    // Function component
    if (
        typeof component === "function" &&
        (!component.prototype || !component.prototype.render) &&
        !component["isReactClass"] &&
        !Object.prototype.isPrototypeOf.call(React.Component, component)
    ) {
        return observerLite(component as React.StatelessComponent<any>) as T
    }

    return makeClassComponentObserver(component as React.ComponentClass<any, any>) as T
}
