import { makeObservable } from "mobx"
import { useState, useSyncExternalStore } from "react"

if (!useState || !useSyncExternalStore) {
    throw new Error("mobx-react-lite requires React 18 or later")
}
if (!makeObservable) {
    throw new Error("mobx-react-lite requires mobx at least version 7 to be available")
}
