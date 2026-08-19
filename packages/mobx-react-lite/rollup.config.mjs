import createRollupConfig from "../../scripts/create-rollup-config.mjs"

export default createRollupConfig({
    packageName: "mobxReactLite",
    packageBase: "mobxreactlite",
    input: "src/index.ts",
    globals: {
        react: "React",
        mobx: "mobx"
    }
})
