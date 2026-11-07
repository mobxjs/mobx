import { createBabelPlugin } from "./plugin"

const mobxReactPlugin = createBabelPlugin(false)

namespace mobxReactPlugin {
    export type Options = import("./options").Options
    export type ObserverOptions = import("./options").ObserverOptions
    export type FilterPattern = import("./options").FilterPattern
    export type TransformResult = import("./plugin").TransformResult
}

export = mobxReactPlugin
