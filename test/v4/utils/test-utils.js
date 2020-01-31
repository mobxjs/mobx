"use strict"

exports.consoleError = function(block, regex) {
    let messages = ""
    const orig = console.error
    console.error = function() {
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

exports.consoleWarn = function(block, regex) {
    let messages = ""
    const orig = console.warn
    console.warn = function() {
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

exports.supressConsole = function(block) {
    const messages = []
    const { warn, error } = console
    Object.assign(console, {
        warn(e) {
            messages.push("[warn] " + e)
        },
        error(e) {
            messages.push("[error] " + e)
        }
    })
    try {
        block()
    } finally {
        Object.assign(console, { warn, error })
    }
    return messages
}
