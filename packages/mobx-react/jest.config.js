const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    testRegex: "__tests__/.*\\.tsx$",
    moduleNameMapper: {
        "^mobx-react-lite$": "<rootDir>/../mobx-react-lite/src/index.ts"
    },
    setupFilesAfterEnv: [`<rootDir>/jest.setup.ts`],
    testPathIgnorePatterns: ["node_modules", "<rootDir>/__tests__/utils"]
})
