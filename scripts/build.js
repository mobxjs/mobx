const fs = require("fs-extra")
const execa = require("execa")
const minimist = require("minimist")
const path = require("path")

const stdio = ["ignore", "inherit", "pipe"]
const opts = { stdio }

const {
    _: [packageName],
    target
} = minimist(process.argv.slice(2))

const run = async () => {
    if (!fs.existsSync(path.join(process.cwd(), "rollup.config.js"))) {
        throw new Error(`No rollup.config.js found for ${packageName}`)
    }

    const args = ["--config"]
    if (target) {
        args.push("--environment", `TARGET:${target}`)
    }

    await execa("rollup", args, opts).catch(err => {
        throw new Error(`build failed: ${err.stderr}`)
    })
}

run().catch(err => {
    console.error(err)
    process.exit(1)
})
