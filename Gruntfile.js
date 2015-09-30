var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

module.exports = function(grunt) {
    var tsc = "node " + __dirname + "/node_modules/typescript/bin/tsc".replace(/\//g, path.sep);
    console.log("Compiling with: " + tsc);
    grunt.initConfig({
        nodeunit: {
            options: { reporter: 'default' },
            all: ['test/*.js'],
            perf: ['test/perf/*.js']
        },
        exec: {
            cover: "istanbul cover nodeunit test/",
            buildtypescripttest: {
                cmd: tsc + " typescript-test.ts -m commonjs -t es5 --experimentalDecorators",
                cwd: "test/"
            },
            buildtsc: tsc,
            webpack: "NODE_ENV=production ./node_modules/webpack/bin/webpack.js",
            copytypings: "cp -rf .build/*.d.ts test/node_modules/mobservable" // TODO: dir might not exist
        },
        coveralls: {
            options: {
                // LCOV coverage file relevant to every target
                force: true
            },
            default: {
                src: 'coverage/lcov.info',
            }
        },
        uglify: {
            dist: {
                files: {
                    'dist/mobservable.min.js': ['dist/mobservable.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask("builddts", "Build .d.ts file", function() {
        var moduleDeclaration = '\n\ndeclare module "mobservable" {\n\tvar m : IMobservableStatic;\n\texport = m;\n}';
        fs.writeFileSync('dist/mobservable.d.ts', fs.readFileSync('lib/api.ts','utf8') + moduleDeclaration, 'utf8');
    });

    grunt.registerTask("preparetest", "Create node module in test folder", function() {
        mkdirp.sync("test/node_modules/mobservable/dist/");
        //fs.writeFileSync("test/node_modules/mobservable/index.d.ts", fs.readFileSync("dist/mobservable.d.ts","utf8"),"utf8");
        fs.writeFileSync("test/node_modules/mobservable/index.js", "module.exports=require('../../../dist/mobservable.js');","utf8");
    });

    grunt.registerTask("publish", "Publish to npm", function() {
        require("./publish.js");
    });
    grunt.registerTask("default", ["buildlocal"]);
    grunt.registerTask("builddist", ["exec:buildtsc", "webpack"]);// "exec:builddist","builddts","uglify:dist"]);
    grunt.registerTask("buildlocal", ["exec:buildtsc", "exec:webpack"]);
    grunt.registerTask("cover", ["builddist", "preparetest:dist", "exec:cover", "coveralls:default"]);
    grunt.registerTask("test", ["buildlocal", "exec:copytypings", "preparetest", "exec:buildtypescripttest", "nodeunit:all"]);
    grunt.registerTask("perf", ["buildlocal", "preparetest:.build", "nodeunit:perf"]);
};