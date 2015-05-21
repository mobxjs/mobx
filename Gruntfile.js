var fs = require('fs');

module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            options: {
                module: 'commonjs',
                target: 'es5'
            },
            builddist : {
                src: ["mobservable.ts"],
                outDir: "dist/",
                comments: false,
            },
            buildlocal : {
                src: ["mobservable.ts"]
            },
            buildtypescripttest: {
                options: {
                     compiler: './node_modules/typescript/bin/tsc'
                },
                src: ["test/typescript-test.ts"]
            }
        },
        nodeunit: {
            options: {
                reporter: 'default'
            },
            all: ['test/*.js'],
            perf: ['test/perf/*.js']
        },
        exec: {
            cover: "istanbul cover nodeunit test/*.js",
            testsetup: "mkdir -p test/node_modules/mobservable " +
                    "&& ln -sf ../../../mobservable.js test/node_modules/mobservable/index.js" +
                    "&& ln -sf ../../../mobservable.d.ts test/node_modules/mobservable"
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

    grunt.loadNpmTasks("grunt-ts");
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
    grunt.registerTask("publish", "Publish to npm", function() {
        require("./publish.js");
    });
    grunt.registerTask("default", ["buildlocal"]);
    grunt.registerTask("build", ["ts:builddist","buildDts"]);
    grunt.registerTask("buildlocal", ["ts:buildlocal", "exec:testsetup", "buildDts"]);
    grunt.registerTask("cover", ["buildlocal", "exec:cover", "coveralls:default"]);
    grunt.registerTask("test", ["buildlocal", "ts:buildtypescripttest", "nodeunit:all"]);
    grunt.registerTask("perf", ["buildlocal", "nodeunit:perf"]);
};