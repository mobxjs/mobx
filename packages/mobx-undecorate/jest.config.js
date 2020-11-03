module.exports = {
    preset: "ts-jest/presets/js-with-ts",

    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.test.json"
        }
    },
    testRegex: "__tests__/.*\\.spec\\.(t|j)sx?$"
}
