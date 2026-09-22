import createRollupConfig from "../../scripts/create-rollup-config.mjs"

export default createRollupConfig({
    packageName: "mobx",
    input: "src/mobx.ts",
    globals: {
        react: "React",
        "react-native": "ReactNative"
    }
})
