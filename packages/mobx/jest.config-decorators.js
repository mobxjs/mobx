const path = require("path")
const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(
    __dirname,
    {
        testRegex: "__tests__/decorators_20223/.*\\.(t|j)sx?$",
        setupFilesAfterEnv: [`<rootDir>/jest.setup.ts`]
    },
    path.resolve(__dirname, "./__tests__/decorators_20223/tsconfig.json")
)
