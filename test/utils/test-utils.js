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
    expect(messages).toMatch(regex)
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
    const { warn, error } = console
    Object.assign(console, {
        warn() {},
        error() {}
    })
    try {
        block()
    } finally {
        Object.assign(console, { warn, error })
    }
}
