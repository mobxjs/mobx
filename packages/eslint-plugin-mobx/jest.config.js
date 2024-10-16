const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    testRegex: "__tests__/[^/]+\\.(t|j)sx?$"
})
