const start = Date.now()

const ver = process.argv[2]
if (!ver || !ver.startsWith("v")) {
    throw new Error("specify version to perf test as v(4|5)")
}

if (process.env.PERSIST) {
    const fs = require("fs")
    const logFile = `${__dirname}/perf_${ver}.txt`
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

const perf = require("./perf.js")
perf(ver)

// This test runs last..
require("tape")(t => {
    exports.logMeasurement(
        "\n\nCompleted performance suite in " + (Date.now() - start) / 1000 + " sec."
    )
    t.end()
})
