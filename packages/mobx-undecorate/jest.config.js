const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    testRegex: "__tests__/.*\\.spec\\.(t|j)sx?$"
})
