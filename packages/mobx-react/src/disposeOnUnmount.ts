import React from "react"
import { patch, newSymbol } from "./utils/utils"

type Disposer = () => void

const protoStoreKey = newSymbol("disposeOnUnmountProto")
const instStoreKey = newSymbol("disposeOnUnmountInst")

function runDisposersOnWillUnmount() {
    ;[...(this[protoStoreKey] || []), ...(this[instStoreKey] || [])].forEach(propKeyOrFunction => {
        const prop =
            typeof propKeyOrFunction === "string" ? this[propKeyOrFunction] : propKeyOrFunction
        if (prop !== undefined && prop !== null) {
            if (Array.isArray(prop)) prop.map(f => f())
            else prop()
        }
    })
}

export function disposeOnUnmount(target: React.Component<any, any>, propertyKey: PropertyKey): void
export function disposeOnUnmount<TF extends Disposer | Array<Disposer>>(
    target: React.Component<any, any>,
    fn: TF
): TF

export function disposeOnUnmount(
    target: React.Component<any, any>,
    propertyKeyOrFunction: PropertyKey | Disposer | Array<Disposer>
): PropertyKey | Disposer | Array<Disposer> | void {
    if (Array.isArray(propertyKeyOrFunction)) {
        return propertyKeyOrFunction.map(fn => disposeOnUnmount(target, fn))
    }

    const c = Object.getPrototypeOf(target).constructor
    const c2 = Object.getPrototypeOf(target.constructor)
    // Special case for react-hot-loader
    const c3 = Object.getPrototypeOf(Object.getPrototypeOf(target))
    if (
        !(
            c === React.Component ||
            c === React.PureComponent ||
            c2 === React.Component ||
            c2 === React.PureComponent ||
            c3 === React.Component ||
            c3 === React.PureComponent
        )
    ) {
        throw new Error(
            "[mobx-react] disposeOnUnmount only supports direct subclasses of React.Component or React.PureComponent."
        )
    }

    if (
        typeof propertyKeyOrFunction !== "string" &&
        typeof propertyKeyOrFunction !== "function" &&
        !Array.isArray(propertyKeyOrFunction)
    ) {
        throw new Error(
            "[mobx-react] disposeOnUnmount only works if the parameter is either a property key or a function."
        )
    }

    // decorator's target is the prototype, so it doesn't have any instance properties like props
    const isDecorator = typeof propertyKeyOrFunction === "string"

    // add property key / function we want run (disposed) to the store
    const componentWasAlreadyModified = !!target[protoStoreKey] || !!target[instStoreKey]
    const store = isDecorator
        ? // decorators are added to the prototype store
          target[protoStoreKey] || (target[protoStoreKey] = [])
        : // functions are added to the instance store
          target[instStoreKey] || (target[instStoreKey] = [])

    store.push(propertyKeyOrFunction)

    // tweak the component class componentWillUnmount if not done already
    if (!componentWasAlreadyModified) {
        patch(target, "componentWillUnmount", runDisposersOnWillUnmount)
    }

    // return the disposer as is if invoked as a non decorator
    if (typeof propertyKeyOrFunction !== "string") {
        return propertyKeyOrFunction
    }
}
