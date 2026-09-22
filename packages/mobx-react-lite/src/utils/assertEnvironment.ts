import { _getGlobalState } from "mobx"
import { useState, useSyncExternalStore } from "react"

if (!useState || !useSyncExternalStore) {
    throw new Error("mobx-react-lite requires React 18 or later")
}
if (!(_getGlobalState?.()?.version >= 7)) {
    throw new Error("mobx-react-lite requires mobx at least version 7 to be available")
}
