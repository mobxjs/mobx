const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(__dirname, {
    displayName: 'eslint-plugin-mobx with eslint@7',
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    testRegex: "__tests__/[^/]+\\.(t|j)sx?$",
    globals: {
        ESLINT_V: 7
    }
})