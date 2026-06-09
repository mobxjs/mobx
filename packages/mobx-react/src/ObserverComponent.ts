import { useObserverInternal } from "./useObserverInternal"
import type { ReactElement } from "react"

interface IObserverProps {
    children?(): ReactElement | null
    render?(): ReactElement | null
}

function ObserverComponent({ children, render }: IObserverProps) {
    if (children && render) {
        console.error(
            "MobX Observer: Do not use children and render in the same time in `Observer`"
        )
    }
    const component = children || render
    if (typeof component !== "function") {
        return null
    }
    return useObserverInternal(component)
}
ObserverComponent.displayName = "Observer"

export { ObserverComponent as Observer }
