const fs = require("fs-extra")
const path = require("path")
const execa = require("execa")

const stdio = ["ignore", "inherit", "ignore"]
const cwd = path.resolve("../")
const opts = { stdio }

// build to publish needs to do more things so it's slower
// for the CI run and local testing this is not necessary
const isPublish = process.argv[2] === "publish"

const tempMove = name => fs.move(`dist/${name}`, `temp/${name}`)
const moveTemp = name => fs.move(`temp/${name}`, `dist/${name}`)

const run = async () => {
    if (isPublish) {
        // build dev/prod ESM bundles that can be consumed in browser without NODE_ENV annoyance
        // and these builds cannot be run in parallel because tsdx doesn't allow to change target dir
        await execa("tsdx", ["build", "--format", "esm", "--env", "development"], opts)
        // tsdx will purge dist folder, so it's necessary to move these
        await tempMove("mobx.esm.development.js")
        await tempMove("mobx.esm.development.js.map")

        await execa("tsdx", ["build", "--format", "esm", "--env", "production"], opts)
        await tempMove("mobx.esm.production.min.js")
        await tempMove("mobx.esm.production.min.js.map")
    }

    await execa("tsdx", ["build", "--name", "mobx", "--format", "esm,cjs,umd"], opts)

    if (isPublish) {
        await moveTemp("mobx.esm.development.js")
        await moveTemp("mobx.esm.development.js.map")
        await moveTemp("mobx.esm.production.min.js")
        await moveTemp("mobx.esm.production.min.js.map")

        await fs.remove("temp")

        await fs.copy("flow-typed/mobx.js", "dist/index.js.flow")
        await fs.copy("../../README.md", "./README.md")
        await fs.copy("../../LICENSE", "./LICENSE")
    }
}

run().catch(console.error)
