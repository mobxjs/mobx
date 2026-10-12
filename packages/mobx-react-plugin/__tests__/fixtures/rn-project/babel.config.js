// A React Native project's babel.config.js: the plugin runs before React Compiler.
module.exports = {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
        [require.resolve("../../../src/babel"), {}],
        ["babel-plugin-react-compiler", {}]
    ]
}
