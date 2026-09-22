module.exports = {
    coverageDirectory: "<rootDir>/coverage/",
    coverageReporters: ["lcov", "text"],
    projects: ["<rootDir>/packages/*/jest.config.js", "<rootDir>/packages/*/jest.config-*.js"]
}
