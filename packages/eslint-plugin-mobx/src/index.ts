import fs from "fs"
import path from "path"

import type { ESLint, Linter } from "eslint"

import exhaustiveMakeObservable from "./exhaustive-make-observable"
import unconditionalMakeObservable from "./unconditional-make-observable"
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
        "no-anonymous-observer": noAnonymousObserver
    }
}

const plugin: typeof pluginMobx & {
    configs: { recommended: Linter.Config }
} = {
    ...pluginMobx,
    configs: {
        recommended: {
            name: "mobx/recommended",
            plugins: { mobx: pluginMobx },
            rules: {
                "mobx/exhaustive-make-observable": "warn",
                "mobx/unconditional-make-observable": "error"
            }
        }
    }
}

export = plugin
