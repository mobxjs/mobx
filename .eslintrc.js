module.exports = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: "eslint:recommended",
    ignorePatterns: ["**/__tests__/**/*"],
    env: {
        browser: true,
        es6: true,
        node: true
    },
    parserOptions: {
        ecmaVersion: 6,
        sourceType: "module"
    },
    rules: {
        "no-fallthrough": "off",
        "no-constant-condition": "off",
        curly: "error",
        "getter-return": "off",
        "no-console": "off",
        "no-var": "error",
        "no-undef": "off",
        "no-extra-semi": "off", // doesn't get along well with prettier
        "no-unused-vars": "off", // got typescript for that,
        "no-redeclare": "off", // No idea what it does, but it dies
        "require-yield": "off" // Doesn't work with TS
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
