"use strict"

const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const bundleArtifacts = [
    {
        format: "cjs",
        file: "dist/mobx.cjs.production.min.js"
    },
    {
        format: "esm",
        file: "dist/mobx.esm.production.min.js"
    }
]

const examples = {
    minimal: {
        title: "Minimal production ESM bundle size for mobx",
        file: "scripts/size-minimal-example.js"
    },
    "make-auto-observable": {
        title: "makeAutoObservable production ESM bundle size for mobx",
        file: "scripts/size-make-auto-observable-example.js"
    }
}

const validModes = new Set(["bundle", ...Object.keys(examples)])
const modes = process.argv.slice(2)
const selectedModes = modes.length > 0 ? modes : ["bundle"]

const formatBytes = bytes => `${(bytes / 1024).toFixed(2)} KiB`

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

const measureSource = source => {
    const gzipped = zlib.gzipSync(source, { level: 9 })

    return {
        raw: source.length,
        gzip: gzipped.length
    }
}

const measureFile = file => {
    const filePath = path.join(__dirname, "..", file)
    const source = fs.readFileSync(filePath)

    return measureSource(source)
}

const printRows = (title, rows) => {
    console.log(`\n${title}:`)
    console.table(rows)
}

const createSizeRow = ({ format, file, raw, gzip }) => ({
    format,
    file,
    raw: formatBytes(raw),
    "raw bytes": raw,
    gzip: formatBytes(gzip),
    "gzip bytes": gzip
})

const checkBundle = () => {
    const rows = bundleArtifacts.map(artifact => {
        const { raw, gzip } = measureFile(artifact.file)

        return createSizeRow({
            format: artifact.format,
            file: artifact.file,
            raw,
            gzip
        })
    })

    printRows("Production artifact sizes for mobx", rows)
}

const checkExample = async name => {
    const { rollup } = require("rollup")
    const nodeResolve = require("@rollup/plugin-node-resolve")
    const replace = require("@rollup/plugin-replace")
    const { terser } = require("rollup-plugin-terser")
    const example = examples[name]
    const input = path.join(__dirname, "..", example.file)

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
                name: "size-example",
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
            nodeResolve.default({
                mainFields: ["module", "main"]
            })
        ]
    })

    try {
        const { output } = await bundle.generate({
            format: "esm",
            plugins: [terser(terserOptions)]
        })
        const code = output[0].code
        const { raw, gzip } = measureSource(code)

        printRows(example.title, [
            createSizeRow({
                format: "esm",
                file: example.file,
                raw,
                gzip
            })
        ])
    } finally {
        await bundle.close()
    }
}

const run = async () => {
    for (const mode of selectedModes) {
        if (!validModes.has(mode)) {
            throw new Error(`Unknown size mode: ${mode}`)
        }

        if (mode === "bundle") {
            checkBundle()
        } else {
            await checkExample(mode)
        }
    }
}

run().catch(error => {
    console.error(error)
    process.exit(1)
})
