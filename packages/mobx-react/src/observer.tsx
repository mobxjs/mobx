import * as React from "react"
import { observer as observerLite } from "mobx-react-lite"

import { ClassObserverOptions, makeClassComponentObserver } from "./observerClass"
import { IReactComponent } from "./types/IReactComponent"

/**
 * Observer function / decorator
 */
export function observer<T extends IReactComponent>(component: T): T
export function observer<T extends React.ComponentClass<any>>(
    component: T,
    options: ClassObserverOptions
): T
export function observer(
    options: ClassObserverOptions
): <T extends React.ComponentClass<any>>(component: T) => T
export function observer(component, options?) {
    // @observer({ ...options })
    if (typeof component === "object" && !("$$typeof" in component)) {
        options = component
        component = undefined
        return <T extends React.ComponentClass<any>>(component: T) => observer(component, options)
    }

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
        return makeClassComponentObserver(component as React.ComponentClass<any, any>, {
            ...observer.default_class_options,
            ...(options || {})
        })
    } else {
        // Function component
        return observerLite(component as React.FunctionComponent<any>)
    }
}

observer.default_class_options = {
    observable_props: false
} as ClassObserverOptions
