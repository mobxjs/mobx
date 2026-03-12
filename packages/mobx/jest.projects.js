module.exports = {
    collectCoverageFrom: ["<rootDir>/src/**/*.{ts,tsx}", "!**/node_modules/**"],
    coverageDirectory: "<rootDir>/coverage/",
    coverageReporters: ["lcov", "text"],
    projects: ["<rootDir>/jest.config.js", "<rootDir>/jest.config-decorators.js"]
}
