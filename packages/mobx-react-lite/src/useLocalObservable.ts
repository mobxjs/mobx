import { observable, AnnotationsMap } from "mobx"
import { useState } from "react"

export function useLocalObservable<TStore extends object>(
    initializer: () => TStore,
    annotations?: AnnotationsMap<TStore, never>
): TStore {
    return useState(() => observable(initializer(), annotations, { autoBind: true }))[0]
}
