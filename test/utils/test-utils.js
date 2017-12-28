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

// TODO: move check globalState, cleanSpyEvents to here.
