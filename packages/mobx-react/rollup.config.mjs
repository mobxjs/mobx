import createRollupConfig from "../../scripts/create-rollup-config.mjs"

export default createRollupConfig({
    packageName: "mobxReact",
    packageBase: "mobxreact",
    input: "src/index.ts",
    globals: {
        react: "React",
        mobx: "mobx",
        "mobx-react-lite": "mobxReactLite"
    }
})
