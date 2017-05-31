const rollup = require('rollup');
const fs = require('fs-extra');
const path = require('path');
const ts = require('typescript');
const exec = require('child_process').execSync;

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, '..'));

const binFolder = path.resolve('node_modules/.bin/');

fs.removeSync('lib');
fs.removeSync('.build');

function runTypeScriptBuild() {
	console.log('Running typescript build.');
	const tsConfig = path.resolve('tsconfig.json');
	const json = ts.parseConfigFileTextToJson(
		tsConfig,
		ts.sys.readFile(tsConfig),
		true
	);

	const { options } = ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(tsConfig));

	options.module = ts.ModuleKind.ES2015;
	options.outDir = path.resolve('.', '.build');
	options.declarationDir = path.resolve('.', 'lib');
	options.importHelpers = true;
	options.noEmitHelpers = true;

	const rootFile = path.resolve('src', 'mobx.ts');
	const host = ts.createCompilerHost(options, true);
	const prog = ts.createProgram([rootFile], options, host);
	const result = prog.emit();
	if (result.emitSkipped) {
		const message = result.diagnostics.map(d =>
			`${ts.DiagnosticCategory[d.category]} ${d.code} (${d.file}:${d.start}): ${d.messageText}`
		).join('\n');

		throw new Error(`Failed to compile typescript:\n\n${message}`);
	}
}

function generateBundledModule() {
	console.log('Generating lib/mobx.js bundle.');
	return rollup.rollup({
		entry: '.build/mobx.js',
		plugins: [
			require('rollup-plugin-node-resolve')(),
			require('rollup-plugin-progress')(),
			require('rollup-plugin-filesize')()
		]
	}).then(bundle => bundle.write({
		dest: 'lib/mobx.js',
		format: 'cjs',
		banner: '/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */',
		exports: 'named',
	}));
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

function build() {
	runTypeScriptBuild();
	return generateBundledModule().then(() => {
		generateUmd();
		generateMinified();
		copyFlowDefinitions();
	});
}

build().catch(e => {
	console.error(e);
	if (e.frame) {
		console.error(e.frame);
	}
	process.exit(1);
});
