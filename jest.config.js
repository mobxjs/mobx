const buildConfig = require("./jest.base.config")

module.exports = buildConfig(__dirname, {
    projects: ["<rootDir>/packages/*/jest.config.js"]
    // collectCoverageFrom: ["<rootDir>/packages/*/src/**/*.{ts,tsx}"]
})
