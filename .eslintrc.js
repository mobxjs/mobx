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
        // Things that don't play nicely with TS:
        "no-unused-vars": "off",
        "no-extra-semi": "off"
    },
    globals: {
        process: "readable",
        global: "readable",
        console: "readable",
        setTimeout: "readable",
        clearTimeout: "readable",
        module: "writable"
    }
}
