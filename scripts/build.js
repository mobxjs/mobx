const typescript = require('rollup-plugin-typescript2');
const progress = require('rollup-plugin-progress');
const filesize = require('rollup-plugin-filesize');

const rollup = require('rollup');
const babel = require('babel-core');

const rmdir = require('rimraf').sync;
const fs = require('fs');
const path = require('path');

const exec = require('child_process').execSync;

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, '..'));

const binFolder = path.resolve('node_modules/.bin/');

rmdir('lib');

try {
	fs.mkdirSync('lib');
} catch (_) { }

async function generateBundledModule() {
	console.log('Generating lib/mobx.js bundle.');
	const bundle = await rollup.rollup({
		entry: 'src/mobx.ts',
		plugins: [
			typescript(),
			progress(),
			filesize()
		]
	});

	await bundle.write({
		dest: 'lib/mobx.js',
		format: 'cjs',
		banner: '/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */',
		exports: 'named',
	});
}

function generateUmd() {
	console.log('Generating mobx.umd.js');
	exec('browserify -s mobx -e lib/mobx.js -o lib/mobx.umd.js');
}

function generateMinified() {
	console.log('Generating mobx.min.js and mobx.umd.min.js');
	exec(
		`${binFolder}/uglifyjs -m sort,toplevel -c warnings=false --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.min.js.map -o lib/mobx.min.js lib/mobx.js`
	);
	exec(
		`${binFolder}/uglifyjs -m sort,toplevel -c warnings=false --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.umd.min.js.map -o lib/mobx.umd.min.js lib/mobx.umd.js`
	);
}

function copyFlowDefinitions() {
	console.log('Copying flowtype definitions');
	exec(`${binFolder}/ncp flow-typed/mobx.js lib/mobx.js.flow`);
}

async function build() {
	await generateBundledModule();
	generateUmd();
	generateMinified();
	copyFlowDefinitions();
}

build().catch(e => {
	console.error(e);
	if (e.frame) {
		console.error(e.frame);
	}
	process.exit(1);
});
