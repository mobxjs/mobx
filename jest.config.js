module.exports = {
    coverageDirectory: "<rootDir>/coverage/",
    coverageReporters: ["lcov", "text"],
    // Keep this list flat so nested package aggregators are not validated as leaf projects.
    projects: [
        "<rootDir>/packages/mobx-react-lite/jest.config.js",
        "<rootDir>/packages/mobx-react/jest.config.js",
        "<rootDir>/packages/mobx-undecorate/jest.config.js",
        "<rootDir>/packages/mobx/jest.config-base.js",
        "<rootDir>/packages/mobx/jest.config-decorators.js",
        "<rootDir>/packages/eslint-plugin-mobx/jest.config-eslint-7.js",
        "<rootDir>/packages/eslint-plugin-mobx/jest.config-eslint-9.js"
    ]
}
