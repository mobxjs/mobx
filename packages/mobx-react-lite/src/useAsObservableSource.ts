import { useDeprecated } from "./utils/utils"
import { observable, runInAction } from "mobx"
import { useState } from "react"

export function useAsObservableSource<TSource>(current: TSource): TSource {
    if ("production" !== process.env.NODE_ENV)
        useDeprecated(
            "[mobx-react-lite] 'useAsObservableSource' is deprecated, please store the values directly in an observable, for example by using 'useLocalObservable', and sync future updates using 'useEffect' when needed. See the README for examples."
        )
    const [res] = useState(() => observable(current, {}, { deep: false }))
    runInAction(() => {
        Object.assign(res, current)
    })
    return res
}
