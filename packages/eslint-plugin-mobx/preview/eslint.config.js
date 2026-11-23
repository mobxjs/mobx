// Build the plugin (npm -w eslint-plugin-mobx run build), then run: npx eslint packages/eslint-plugin-mobx/preview
const tsParser = require("@typescript-eslint/parser")
const pluginMobx = require("../dist")

module.exports = [
    pluginMobx.configs.recommended,
    {
        languageOptions: {
            parser: tsParser
        }
    }
]
