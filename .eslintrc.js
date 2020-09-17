module.exports = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: "eslint:recommended",
    env: {
        es6: true
    },
    parserOptions: {
        ecmaVersion: 6,
        sourceType: "module"
    },
    rules: {
        "no-fallthrough": "off",
        "no-constant-condition": "off",
        "getter-return": "off",
        "no-console": "off",
        "no-var": "error",
        "no-undef": "off",
        "no-extra-semi": "off", // doesn't get along well with prettier
        "no-unused-vars": "off", // got typescript for that,
        "no-redeclare": "off" // No idea what it does, but it dies
    },
    globals: {
        process: "readable",
        global: "readable",
        console: "readable",
        setTimeout: "readable",
        clearTimeout: "readable",
        module: "writable"
    },
    overrides: [
        {
            files: ["**/*.ts"],
            rules: {
                // Things that don't play nicely with TS:
                "require-yield": "off",
                "no-unused-vars": "off",
                "no-extra-semi": "off"
            }
        }
    ]
}
