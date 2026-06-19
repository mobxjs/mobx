import execa from "execa"
import fs from "fs-extra"
import minimist from "minimist"
import path from "node:path"

const stdio = ["ignore", "inherit", "pipe"]
const opts = { stdio }

const {
    _: [packageName],
    target
} = minimist(process.argv.slice(2))

const run = async () => {
    const configFile = ["rollup.config.mjs", "rollup.config.js"].find(file =>
        fs.existsSync(path.join(process.cwd(), file))
    )

    if (!configFile) {
        throw new Error(`No rollup.config.mjs or rollup.config.js found for ${packageName}`)
    }

    const args = ["--config", configFile]
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
