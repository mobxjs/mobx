import { makeObservable } from "mobx"
import { useState } from "react"

if (!useState) {
    throw new Error("mobx-react requires React with Hooks support")
}
if (!makeObservable) {
    throw new Error("mobx-react requires mobx at least version 7 to be available")
}
