import type { Linter, Rule } from "eslint"

declare const mobxPlugin: {
    meta: {
        name: string
        version: string
    }
    rules: Record<string, Rule.RuleModule>
    configs: {
        recommended: Linter.LegacyConfig
    }
    flatConfigs: {
        recommended: Linter.Config
    }
}

export = mobxPlugin
