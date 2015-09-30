var webpack = require('webpack');

module.exports = {
    entry: './.build/index.js',
    output: {
        libraryTarget: 'umd',
        library: 'mobservable',
        //path: __dirname + '.build/',
        filename: 'dist/mobservable.js'
    },
    plugins: [
/*        new webpack.optimize.UglifyJsPlugin({
            compressor: {
              screw_ie8: true,
              warnings: false
            }
        })
*/    ]
}
