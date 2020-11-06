const fs = require("fs-extra")
const path = require("path")
const execa = require("execa")

const run = () => {
    fs.copySync("flow-typed/mobx.js", "dist/index.js.flow")
    fs.copySync("../../README.md", "./README.md")
    fs.copySync("../../LICENSE", "./LICENSE")
}

run()
