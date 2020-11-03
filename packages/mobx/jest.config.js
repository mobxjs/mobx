module.exports = {
    preset: "ts-jest/presets/js-with-ts",

    globals: {
        __DEV__: true,
        "ts-jest": {
            tsconfig: "tsconfig.test.json"
        }
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
    testRegex: "__tests__/v[4|5]/base/.*\\.(t|j)sx?$",
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"]
}
