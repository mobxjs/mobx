import { observable, AnnotationsMap } from "mobx"
import { useRef } from "react"

export function useLocalObservable<TStore extends Record<string, any>>(
    initializer: () => TStore,
    annotations?: AnnotationsMap<TStore, never>
): TStore {
    const value = useRef(null)
    
    if (value.current == null) {
        value.current = observable(initializer(), annotations, { autoBind: true })
    }
    
    return value.current
}
