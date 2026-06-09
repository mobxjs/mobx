import * as React from "react"

import { observerFunction } from "./observerFunction"
import { makeClassComponentObserver } from "./observerClass"
import { IReactComponent } from "./types/IReactComponent"

/**
 * Observer function / decorator
 */
export function observer<C extends React.FunctionComponent<any>>(
    component: C
): C & React.MemoExoticComponent<C>
export function observer<P extends object>(
    component: React.FunctionComponent<P>
): React.FunctionComponent<P> & React.MemoExoticComponent<React.FunctionComponent<P>>
export function observer<P extends object, TRef = {}>(
    component: React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
): React.MemoExoticComponent<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
>
export function observer<T extends React.ComponentClass<any, any>>(component: T): T
export function observer<T extends IReactComponent>(
    component: T,
    context: ClassDecoratorContext
): void
export function observer<T extends IReactComponent>(component: T): T
export function observer<T extends IReactComponent>(
    component: T,
    context?: ClassDecoratorContext
): T {
    if (context && context.kind !== "class") {
        throw new Error("The @observer decorator can be used on classes only")
    }

    if (
        Object.prototype.isPrototypeOf.call(React.Component, component) ||
        Object.prototype.isPrototypeOf.call(React.PureComponent, component)
    ) {
        // Class component
        return makeClassComponentObserver(component as React.ComponentClass<any, any>) as T
    } else {
        // Function component
        return observerFunction(component as React.FunctionComponent<any>) as unknown as T
    }
}
