"use strict"

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const zlib = require("zlib")

const repoRoot = path.join(__dirname, "..", "..")
const shouldBuild = !process.argv.includes("--no-build")

const publishBuilds = [
    ["mobx", "mobx"],
    ["mobx-react-lite", "mobx-react-lite"],
    ["mobx-react", "mobx-react"]
]

const artifacts = [
    {
        packageName: "mobx bundle ESM",
        file: "packages/mobx/dist/mobx.esm.production.min.js"
    },
    {
        packageName: "mobx-react-lite",
        file: "packages/mobx-react-lite/dist/mobxreactlite.esm.production.min.js"
    },
    {
        packageName: "mobx-react",
        file: "packages/mobx-react/dist/mobxreact.esm.production.min.js"
    }
]

const terserOptions = {
    module: true,
    compress: {
        hoist_funs: true,
        passes: 2,
        keep_fargs: false,
        pure_getters: true,
        unsafe: false
    },
    mangle: {
        properties: {
            regex: /_$/
        }
    }
}

const formatBytes = bytes => `${(bytes / 1024).toFixed(2)} KiB`

const measureSource = source => {
    const raw = typeof source === "string" ? Buffer.byteLength(source) : source.length
    const gzipped = zlib.gzipSync(source, { level: 9 })

    return {
        raw,
        gzip: gzipped.length
    }
}

const measureFile = file => {
    const filePath = path.join(repoRoot, file)
    const source = fs.readFileSync(filePath)

    return measureSource(source)
}

const createSizeRow = ({ packageName, raw, gzip }) => ({
    package: packageName,
    raw: formatBytes(raw),
    "raw bytes": raw,
    gzip: formatBytes(gzip),
    "gzip bytes": gzip
})

const runBuild = ([workspaceName, packageName]) => {
    console.log(`\nBuilding ${packageName} publish artifacts...`)
    const result = spawnSync(
        "npm",
        ["-w", workspaceName, "run", "build", "--", "--environment", "TARGET:publish"],
        {
            cwd: repoRoot,
            stdio: "inherit",
            shell: process.platform === "win32"
        }
    )

    if (result.error) {
        throw result.error
    }
    if (result.status !== 0) {
        throw new Error(`${packageName} publish build failed with exit code ${result.status}`)
    }
}

const measureMinimalExample = async () => {
    const { rollup } = require("rollup")
    const nodeResolve = require("@rollup/plugin-node-resolve")
    const replace = require("@rollup/plugin-replace")
    const { terser } = require("rollup-plugin-terser")
    const input = path.join(__dirname, "minimal-example.js")
    const resolve = nodeResolve.default || nodeResolve.nodeResolve || nodeResolve

    const bundle = await rollup({
        input,
        onwarn(warning, warn) {
            if (warning.code === "THIS_IS_UNDEFINED") {
                return
            }
            warn(warning)
        },
        plugins: [
            {
                name: "size-minimal-example",
                load(id) {
                    if (id === input) {
                        return fs.readFileSync(input, "utf8")
                    }
                    return null
                }
            },
            replace({
                preventAssignment: true,
                values: {
                    "process.env.NODE_ENV": JSON.stringify("production")
                }
            }),
            resolve({
                mainFields: ["module", "main"]
            })
        ]
    })

    try {
        const { output } = await bundle.generate({
            format: "esm",
            plugins: [terser(terserOptions)]
        })

        return {
            packageName: "mobx minimal* ESM",
            ...measureSource(output[0].code)
        }
    } finally {
        await bundle.close()
    }
}

const run = async () => {
    if (shouldBuild) {
        publishBuilds.forEach(runBuild)
    }

    const rows = [
        createSizeRow({
            packageName: artifacts[0].packageName,
            ...measureFile(artifacts[0].file)
        }),
        createSizeRow(await measureMinimalExample()),
        ...artifacts.slice(1).map(artifact =>
            createSizeRow({
                packageName: artifact.packageName,
                ...measureFile(artifact.file)
            })
        )
    ]

    console.log("\nProduction ESM gzip sizes:")
    console.table(rows)
}

run().catch(error => {
    console.error(error)
    process.exit(1)
})
