"use strict"

const fs = require("fs")
const path = require("path")

const exhaustiveMakeObservable = require("./exhaustive-make-observable.js")
const unconditionalMakeObservable = require("./unconditional-make-observable.js")
const missingMakeObservable = require("./missing-make-observable.js")
const missingObserver = require("./missing-observer")
const noAnonymousObserver = require("./no-anonymous-observer.js")

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"))

const pluginMobx = {
    meta: {
        name: pkg.name,
        version: pkg.version
    },
    rules: {
        "exhaustive-make-observable": exhaustiveMakeObservable,
        "unconditional-make-observable": unconditionalMakeObservable,
        "missing-make-observable": missingMakeObservable,
        "missing-observer": missingObserver,
        "no-anonymous-observer": noAnonymousObserver
    }
}

const recommendedRules = {
    "mobx/exhaustive-make-observable": "warn",
    "mobx/unconditional-make-observable": "error",
    "mobx/missing-make-observable": "error",
    "mobx/missing-observer": "warn"
}

module.exports = {
    ...pluginMobx,
    configs: {
        recommended: {
            plugins: ["mobx"],
            rules: recommendedRules
        }
    },
    flatConfigs: {
        recommended: {
            name: "mobx/recommended",
            plugins: { mobx: pluginMobx },
            rules: recommendedRules
        }
    }
}
