const start = Date.now()

if (process.env.PERSIST) {
    const fs = require("fs")
    const logFile = __dirname + "/perf.txt"
    // clear previous results
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile)

    exports.logMeasurement = function(msg) {
        console.log(msg)
        fs.appendFileSync(logFile, "\n" + msg, "utf8")
    }
} else {
    exports.logMeasurement = function(msg) {
        console.log(msg)
    }
}

require("./perf.js")

// This test runs last..
require("tape")(t => {
    exports.logMeasurement(
        "\n\nCompleted performance suite in " + (Date.now() - start) / 1000 + " sec."
    )
    t.end()
})
