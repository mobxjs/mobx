const fs = require("fs-extra")
const path = require("path")
const execa = require("execa")

const stdio = ["ignore", "inherit", "ignore"]
const opts = { stdio }

const packageName = process.argv[2]

// build to publish needs to do more things so it's slower
// for the CI run and local testing this is not necessary
const isPublish = process.argv[3] === "publish"

const tempMove = name => fs.move(`dist/${name}`, `temp/${name}`)
const moveTemp = name => fs.move(`temp/${name}`, `dist/${name}`)

const run = async () => {
    if (isPublish) {
        // build dev/prod ESM bundles that can be consumed in browser without NODE_ENV annoyance
        // and these builds cannot be run in parallel because tsdx doesn't allow to change target dir
        await execa("tsdx", ["build", "--format", "esm", "--env", "development"], opts)
        // tsdx will purge dist folder, so it's necessary to move these
        await tempMove(`${packageName}.esm.development.js`)
        await tempMove(`${packageName}.esm.development.js.map`)

        await execa("tsdx", ["build", "--format", "esm", "--env", "production"], opts)
        await tempMove(`${packageName}.esm.production.min.js`)
        await tempMove(`${packageName}.esm.production.min.js.map`)
    }

    await execa("tsdx", ["build", "--name", packageName, "--format", "esm,cjs,umd"], opts)

    if (isPublish) {
        // move ESM bundles back to dist folder and remove temp
        await moveTemp(`${packageName}.esm.development.js`)
        await moveTemp(`${packageName}.esm.development.js.map`)
        await moveTemp(`${packageName}.esm.production.min.js`)
        await moveTemp(`${packageName}.esm.production.min.js.map`)
        await fs.remove("temp")
    }
}

run().catch(console.error)
