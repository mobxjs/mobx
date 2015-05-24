var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = function(grunt) {
    var tsc = "./node_modules/typescript/bin/tsc";
    grunt.initConfig({
        nodeunit: {
            all: ['test/*.js'],
            perf: ['test/perf/*.js']
        },
        exec: {
            cover: "istanbul cover nodeunit test/",
            buildtypescripttest: {
                cmd: "." + tsc + " typescript-test.ts -m commonjs -t es5",
                cwd: "test/"
            },
            buildlocal: tsc + " mobservable.ts -t es5 --sourceMap",
            builddist: tsc + " mobservable.ts -t es5 --removeComments -out dist/mobservable.js"
        },
        coveralls: {
            options: {
                // LCOV coverage file relevant to every target
                force: false
            },
            default: {
                src: 'coverage/lcov.info',
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask("buildDts", "Build .d.ts file", function() {
        var moduleDeclaration = '\n\ndeclare module "mobservable" {\n\tvar m : IMObservableStatic;\n\texport = m;\n}';
        var ts = fs.readFileSync('mobservable.ts','utf8');
        var headerEndIndex = ts.indexOf("/* END OF DECLARATION */");
        if (headerEndIndex === -1)
            throw "Failed to find end of declaration in mobservable.ts";
        fs.writeFileSync('mobservable.d.ts', "/** GENERATED FILE */\n" + ts.substr(0, headerEndIndex) + moduleDeclaration, 'utf8');
    });

    grunt.registerTask("preparetest", "Create node module in test folder", function(sourceDir) {
        mkdirp.sync("test/node_modules/mobservable");
        fs.writeFileSync("test/node_modules/mobservable/mobservable.d.ts", fs.readFileSync("mobservable.d.ts","utf8"),"utf8");
        fs.writeFileSync("test/node_modules/mobservable/index.js", "module.exports=require('../../../" + sourceDir + "/mobservable.js');","utf8");
    });

    grunt.registerTask("publish", "Publish to npm", function() {
        require("./publish.js");
    });
    grunt.registerTask("default", ["buildlocal"]);
    grunt.registerTask("builddist", ["exec:builddist","buildDts"]);
    grunt.registerTask("buildlocal", ["exec:buildlocal", "buildDts"]);
    grunt.registerTask("cover", ["builddist", "preparetest:dist", "exec:cover", "coveralls:default"]);
    grunt.registerTask("test", ["buildlocal", "preparetest:", "exec:buildtypescripttest", "nodeunit:all"]);
    grunt.registerTask("perf", ["buildlocal", "preparetest:", "nodeunit:perf"]);
};