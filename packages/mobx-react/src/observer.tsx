import * as React from "react"
import { observer as observerLite } from "mobx-react-lite"

import { makeClassComponentObserver } from "./observerClass"
import { IReactComponent } from "./types/IReactComponent"

/**
 * Observer function / decorator
 */
export function observer<T extends IReactComponent>(component: T): T {
    if (component["isMobxInjector"] === true) {
        console.warn(
            "Mobx observer: You are trying to use `observer` on a component that already has `inject`. Please apply `observer` before applying `inject`"
        )
    }

    if (
        Object.prototype.isPrototypeOf.call(React.Component, component) ||
        Object.prototype.isPrototypeOf.call(React.PureComponent, component)
    ) {
        // Class component
        return makeClassComponentObserver(component as React.ComponentClass<any, any>) as T
    } else {
        // Function component
        return observerLite(component as React.FunctionComponent<any>) as T
    }
}
