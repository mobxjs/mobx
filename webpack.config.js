var webpack = require('webpack');

module.exports = {
    entry: './index.js',
    devtool: 'source-map',
    output: {
        libraryTarget: 'umd',
        library: 'mobservable',
        filename: 'dist/mobservable.js'
    }
}
