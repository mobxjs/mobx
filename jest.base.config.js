const fs = require("fs")
const path = require("path")

const tsConfig = "tsconfig.test.json"

module.exports = function buildConfig(packageDirectory, pkgConfig) {
    const packageName = require(`${packageDirectory}/package.json`).name
    const packageTsconfig = path.resolve(packageDirectory, tsConfig)
    return {
        preset: "ts-jest/presets/js-with-ts",
        globals: {
            __DEV__: true,
            "ts-jest": {
                tsconfig: fs.existsSync(packageTsconfig)
                    ? packageTsconfig
                    : path.resolve(__dirname, tsConfig)
            }
        },
        testRegex: "__tests__/.*\\.(j|t)sx?$",
        coverageDirectory: "<rootDir>/coverage/",
        collectCoverageFrom: ["<rootDir>/packages/*/src/**/*.{ts,tsx}"],
        displayName: packageName,
        ...pkgConfig
    }
}
