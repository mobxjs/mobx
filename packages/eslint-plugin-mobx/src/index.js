"use strict"

import exhaustiveMakeObservable from "./exhaustive-make-observable"
import unconditionalMakeObservable from "./unconditional-make-observable"
import missingMakeObservable from "./missing-make-observable"

module.exports = {
    configs: {
        recommended: {
            plugins: ["mobx"],
            rules: {
                "mobx/exhaustive-make-observable": "warn",
                "mobx/unconditional-make-observable": "error",
                "mobx/missing-make-observable": "error"
            }
        }
    },
    rules: {
        "exhaustive-make-observable": exhaustiveMakeObservable,
        "unconditional-make-observable": unconditionalMakeObservable,
        "missing-make-observable": missingMakeObservable
    }
}
