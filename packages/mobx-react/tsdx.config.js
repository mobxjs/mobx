module.exports = {
    rollup(config) {
        return {
            ...config,
            output: {
                ...config.output,
                globals: {
                    react: "React",
                    mobx: "mobx",
                    "react-dom": "ReactDOM",
                    "mobx-react-lite": "mobxReactLite"
                }
            }
        }
    }
}
