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
            perf: ['test/performance.js']
        },
        exec: {
            cover: "istanbul cover nodeunit test/",
            testsetup: "mkdir -p test/node_modules/mobservable " + 
                    "&& cp mobservable.js test/node_modules/mobservable/index.js" +
                    "&& cp mobservable.d.ts test/node_modules/mobservable"
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

    grunt.registerTask("publish", "Publish to npm", function() {
        require("./publish.js");
    });
    grunt.registerTask("default", ["ts:buildlocal"]);
    grunt.registerTask("build", ["ts:builddist"]);
    grunt.registerTask("cover", ["ts:buildlocal", "exec:cover", "coveralls:default"]);
    grunt.registerTask("test", ["ts:buildlocal","exec:testsetup", "ts:buildtypescripttest", "nodeunit:all"]);
    grunt.registerTask("perf", ["ts:buildlocal", "nodeunit:perf"]);
};