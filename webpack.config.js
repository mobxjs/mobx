var webpack = require('webpack');

module.exports = {
    entry: './lib/index.js',
    output: {
        libraryTarget: 'umd',
        library: 'mobservable',
        filename: 'dist/mobservable.js'
    }
}
