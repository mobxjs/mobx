"use strict"

const fs = require("fs")
const path = require("path")

const exhaustiveMakeObservable = require("./exhaustive-make-observable.js")
const unconditionalMakeObservable = require("./unconditional-make-observable.js")
const missingMakeObservable = require("./missing-make-observable.js")
const missingObserver = require("./missing-observer")
const noAnonymousObserver = require("./no-anonymous-observer.js")

/** @typedef {import("eslint").ESLint.Plugin} Plugin */
/** @typedef {import("eslint").Linter.RulesRecord} RulesRecord */
/** @typedef {import("eslint").Linter.LegacyConfig} LegacyConfig */
/** @typedef {import("eslint").Linter.Config} FlatConfig */

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"))

/** @type {Plugin} */
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

/** @type {RulesRecord} */
const recommendedRules = {
    "mobx/exhaustive-make-observable": "warn",
    "mobx/unconditional-make-observable": "error",
    "mobx/missing-make-observable": "error",
    "mobx/missing-observer": "warn"
}

/** @type {LegacyConfig} */
const recommendedLegacyConfig = {
    plugins: ["mobx"],
    rules: recommendedRules
}

/** @type {FlatConfig} */
const recommendedFlatConfig = {
    name: "mobx/recommended",
    plugins: { mobx: pluginMobx },
    rules: recommendedRules
}

module.exports = {
    ...pluginMobx,
    configs: {
        recommended: recommendedLegacyConfig
    },
    flatConfigs: {
        recommended: recommendedFlatConfig
    }
}
