const start = Date.now()
const mkdirp = require("mkdirp")

const ver = process.argv[2]
if (!ver || !ver.match(/legacy|proxy/)) {
    throw new Error("specify version to perf test as (legacy|proxy)")
}

if (process.env.PERSIST) {
    const fs = require("fs")
    const path = require("path")
    const logFile = path.resolve(`${__dirname}/../../perf_report/${ver}.txt`)
    mkdirp.sync(path.dirname(logFile))
    // clear previous results
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile)

    exports.logMeasurement = function (msg) {
        console.log(msg)
        fs.appendFileSync(logFile, "\n" + msg, "utf8")
    }
} else {
    exports.logMeasurement = function (msg) {
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
