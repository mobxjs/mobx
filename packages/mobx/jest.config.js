const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    projects: ["<rootDir>/jest.config.js", "<rootDir>/jest.config-decorators.js"],
    testRegex: "__tests__/v[4|5]/base/.*\\.(t|j)sx?$",
    setupFilesAfterEnv: [`<rootDir>/jest.setup.ts`]
})
