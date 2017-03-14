const fs = require('fs');
const rmdir = require('rimraf').sync;
const glob = require('glob').sync;
const exec = require('child_process').execSync;

rmdir('lib');
rmdir('.build');

fs.mkdirSync('.build');

fs.writeFileSync('.build/mobx.ts', '/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */\n');

const exportsConfig = fs.readFileSync('src/mobx.ts', 'utf8')
    .split('\n')
    .filter(line => !line.startsWith('import'))
    .map(line => line.replace(/ from.*;/, ';'))
    .join('\n');

fs.writeFileSync('.build/mobx.ts', exportsConfig, { encoding: 'utf8', flag: 'a' });

const files = glob('src/{core,types,api,utils}/*.ts');

const allContents =
    files.map(file => {
        const contents = fs.readFileSync(file, 'utf8')
        const lines = contents.split('\n');

        const filtered = lines
            .filter(line => !line.startsWith('import'))
            .map(line => line.replace(/export /, ''))
            .join('\n');

        return `/* file: ${file} */\n${filtered}`;
    }).join('\n');

fs.writeFileSync('.build/mobx.ts', allContents, { encoding: 'utf8', flag: 'a' });

[
    'tsc -m commonjs -t es5 -d --removeComments --outDir lib .build/mobx.ts',
    'tsc -m es2015 -t es2015 -d --removeComments --outDir lib/es2015 .build/mobx.ts',
    'browserify -s mobx -e lib/mobx.js -o lib/mobx.umd.js',
    `uglifyjs -m sort,toplevel -c --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.min.js.map -o lib/mobx.min.js lib/mobx.js`,
    `uglifyjs -m sort,toplevel -c --screw-ie8 --preamble "/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */" --source-map lib/mobx.umd.min.js.map -o lib/mobx.umd.min.js lib/mobx.umd.js`,
    `ncp flow-typed/mobx.js lib/mobx.js.flow`
]
    .map(cmd => `${__dirname}/../node_modules/.bin/${cmd}`)
    .map(cmd => {
		try {
			exec(cmd);
		} catch (e) {
			console.log(e.stdout.toString());
			console.error(e.stderr.toString());
			process.exit(1);
		}
	})
