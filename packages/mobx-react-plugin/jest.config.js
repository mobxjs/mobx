const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    testRegex: "__tests__/.*\\.test\\.tsx?$",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testPathIgnorePatterns: ["node_modules", "<rootDir>/examples/", "<rootDir>/__tests__/utils"]
})
