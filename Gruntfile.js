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
			}
		},
		 nodeunit: {
		 	options: {
		 		reporter: 'default'
		 	},
		    all: ['test/*.js'],
			perf: ['test/performance.js']
		  }
	});

	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	
	grunt.registerTask("publish", "Publish to npm", function() {
		require("./publish.js");
	});
	grunt.registerTask("default", ["ts:buildlocal"]);
	grunt.registerTask("build", ["ts:builddist"]);
	grunt.registerTask("test", ["ts:buildlocal", "nodeunit:all"]);
	grunt.registerTask("perf", ["ts:buildlocal", "nodeunit:perf"]);

}