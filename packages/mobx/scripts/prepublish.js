const fs = require("fs-extra")
const path = require("path")
const execa = require("execa")

const run = () => {
    fs.copySync("../../README.md", "./README.md")
    fs.copySync("../../LICENSE", "./LICENSE")
}

run()
