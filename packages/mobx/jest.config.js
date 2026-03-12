const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    testRegex: "__tests__/v[4|5]/base/.*\\.(t|j)sx?$",
    setupFilesAfterEnv: [`<rootDir>/jest.setup.ts`]
})
