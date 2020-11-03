// @ts-nocheck
import { $mobx } from "../../../src/mobx"

export function consoleError(block, regex) {
    let messages = ""
    const orig = console.error
    console.error = function () {
        Object.keys(arguments).forEach(key => {
            messages += ", " + arguments[key]
        })
        messages += "\n"
    }
    try {
        block()
    } finally {
        console.error = orig
    }
    expect(messages.length).toBeGreaterThan(0)
    if (regex) expect(messages).toMatch(regex)
    return messages
}

export function consoleWarn(block, regex) {
    let messages = ""
    const orig = console.warn
    console.warn = function () {
        Object.keys(arguments).forEach(key => {
            messages += ", " + arguments[key]
        })
        messages += "\n"
    }
    try {
        block()
    } finally {
        console.warn = orig
    }
    expect(messages.length).toBeGreaterThan(0)
    expect(messages).toMatch(regex)
}

export function supressConsole(block) {
    const messages = []
    const { warn, error } = console
    Object.assign(console, {
        warn(e) {
            messages.push("<STDOUT> " + e)
        },
        error(e) {
            messages.push("<STDERR> " + e)
        }
    })
    try {
        block()
    } finally {
        Object.assign(console, { warn, error })
    }
    return messages
}

export function stripAdminFromDescriptors(snapshot) {
    const mobxProperty = snapshot[$mobx]
    expect(mobxProperty).toBeTruthy()
    return { ...snapshot, [$mobx]: { ...mobxProperty, value: "(omitted)" } }
}

export function grabConsole(block) {
    return supressConsole(block).join("\n")
}
