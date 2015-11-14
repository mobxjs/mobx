var webpack = require('webpack');

module.exports = {
    entry: './lib/index.js',
    devtool: 'source-map',
    output: {
        libraryTarget: 'umd',
        library: 'mobservable',
        filename: 'dist/mobservable.js'
    }
}
