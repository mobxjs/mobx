import { useCallback, useState } from "react"

const EMPTY_ARRAY: any[] = []

export function useForceUpdate() {
    const [, setRef] = useState({})

    const update = useCallback(() => setRef(() => ({})), EMPTY_ARRAY)

    return update
}

const deprecatedMessages: string[] = []

export function useDeprecated(msg: string) {
    if (!deprecatedMessages.includes(msg)) {
        deprecatedMessages.push(msg)
        console.warn(msg)
    }
}
