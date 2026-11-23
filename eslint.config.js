const js = require("@eslint/js")
const tsParser = require("@typescript-eslint/parser")
const globals = require("globals")

const mobxGlobalAliases = {
    "Object.assign": "assign",
    "Object.getOwnPropertyDescriptor": "getDescriptor",
    "Object.getOwnPropertyDescriptors": "getOwnPropertyDescriptors",
    "Object.defineProperty": "defineProperty",
    "Object.prototype": "objectPrototype",
    "Object.getPrototypeOf": "getPrototypeOf",
    "Array.from": "arrayFrom",
    "Array.isArray": "isArray",
    "Reflect.ownKeys": "ownKeys"
}

module.exports = [
    {
        // Lint only packages/*/src, and skip mobx-undecorate
        ignores: [
            "**",
            "!packages/",
            "!packages/*/",
            "!packages/*/src/",
            "!packages/*/src/**",
            "packages/mobx-undecorate/"
        ]
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-fallthrough": "off",
            "no-constant-condition": "off",
            curly: ["error", "multi-line"],
            "getter-return": "off",
            "no-var": "error",
            "no-undef": "off",
            "no-unused-vars": "off", // got typescript for that,
            "no-redeclare": "off", // No idea what it does, but it dies
            "require-yield": "off" // Doesn't work with TS
        }
    },
    {
        files: ["packages/mobx/src/**"],
        rules: {
            "no-restricted-syntax": [
                "error",
                ...Object.entries(mobxGlobalAliases).map(([global, alias]) => {
                    const [object, property] = global.split(".")
                    return {
                        selector: `MemberExpression[object.name="${object}"][property.name="${property}"]:not(VariableDeclarator[id.name="${alias}"] > .init)`,
                        message: `Use the \`${alias}\` alias from utils/utils.ts, it minifies better.`
                    }
                })
            ]
        }
    }
]
