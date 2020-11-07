const fs = require("fs-extra")
const path = require("path")
const execa = require("execa")
const minimist = require("minimist")
const { basename } = require("path")

const stdio = ["ignore", "inherit", "pipe"]
const opts = { stdio }

const {
    _: [packageName],
    target
} = minimist(process.argv.slice(2))

// build to publish needs to do more things so it's slower
// for the CI run and local testing this is not necessary
const isPublish = target === "publish"

// for running tests in CI we need CJS only
const isTest = target === "test"

const run = async () => {
    const tempMove = name => fs.move(`dist/${name}`, `temp/${name}`)
    const moveTemp = name => fs.move(`temp/${name}`, `dist/${name}`)
    const build = (format, env) => {
        const args = ["build", "--name", packageName, "--format", format]
        if (env) {
            args.push("--env", env)
        }
        return execa("tsdx", args, opts)
    }
    if (isPublish) {
        await fs.emptyDir("temp")
        // build dev/prod ESM bundles that can be consumed in browser without NODE_ENV annoyance
        // and these builds cannot be run in parallel because tsdx doesn't allow to change target dir
        await build("esm", "development")
        // tsdx will purge dist folder, so it's necessary to move these
        await tempMove(`${packageName}.esm.development.js`)
        await tempMove(`${packageName}.esm.development.js.map`)

        // cannot build these concurrently
        await build("esm", "production")
        await tempMove(`${packageName}.esm.production.min.js`)
        await tempMove(`${packageName}.esm.production.min.js.map`)
    }

    await build(isTest ? "cjs" : "esm,cjs,umd").catch(err => {
        console.error(err.stderr)
        throw new Error("build failed")
    })

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
