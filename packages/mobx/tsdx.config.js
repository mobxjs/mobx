const { terser } = require("rollup-plugin-terser")

module.exports = {
    // This function will run for each entry/format/env combination
    rollup(config, options) {
        // MWE: disabled minifying esm builds as source maps aren't too reliable.
        // It is a shame because mangle properties saves quite a bit (1 KB gzipped)
        // For comparison:
        // webpack + terser + unminified mobx:
        // 13757
        // webpack + pre-minified mobx:
        // 12949
        if (/*options.format === "esm" || */ options.env === "production") {
            config.plugins.push(
                terser({
                    sourcemap: true,
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
                })
            )
        }
        return config
    }
}
