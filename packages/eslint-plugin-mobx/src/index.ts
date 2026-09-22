import fs from "fs"
import path from "path"

import type { ESLint, Linter } from "eslint"

import exhaustiveMakeObservable from "./exhaustive-make-observable"
import unconditionalMakeObservable from "./unconditional-make-observable"
import missingMakeObservable from "./missing-make-observable"
import missingObserver from "./missing-observer"
import noAnonymousObserver from "./no-anonymous-observer"

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"))

const pluginMobx: ESLint.Plugin = {
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

const recommendedRules: Linter.RulesRecord = {
    "mobx/exhaustive-make-observable": "warn",
    "mobx/unconditional-make-observable": "error",
    "mobx/missing-make-observable": "error",
    "mobx/missing-observer": "warn"
}

const plugin: typeof pluginMobx & {
    configs: { recommended: Linter.LegacyConfig }
    flatConfigs: { recommended: Linter.Config }
} = {
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

export = plugin
