const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    testRegex: "__tests__/.*\\.test\\.ts$",
    testEnvironment: "node"
})
