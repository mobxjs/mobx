const path = require("path")
const fs = require("fs-extra")
const chalk = require("chalk")
const cp = require("child_process")

const mainScript = `
const store = observable.object({ count: 0 });

autorun(function () {
	console.log('store.count: ' + store.count);
});

store.count++;
store.count--;
`

const files = {
    "package.json": `
{
	"name": "mobx-webpack-build",
	"version": "0.0.1",
	"devDependencies": {}
}
	`,

    "webpack.config.js": `
module.exports = {
	entry: './index.js',
	output: {
		path: __dirname,
		filename: './bundle.js'
	}
};`,

    "index.cjs.js": `
const mobx = require('../');
const observable = mobx.observable;
const autorun = mobx.autorun;

${mainScript}
`,

    "index.es.js": `
import { observable, autorun } from '../';

${mainScript}
`
}

function exec(cmd) {
    return new Promise((resolve, reject) => {
        cp.exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(err)
            return resolve({ stdout, stderr })
        })
    })
}

function writeFile(key, name = key) {
    return new Promise((resolve, reject) => {
        fs.writeFile(name, files[key], "utf8", err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

function runWebpackBuild({ webpackVersion, moduleFormat }) {
    const buildDir = path.resolve(__dirname, "..", `.wp-build.${webpackVersion}.${moduleFormat}`)

    const immediate = () => new Promise(r => setImmediate(r))

    function initBuildFolder() {
        fs.mkdirSync(buildDir)
        process.chdir(buildDir)
        return Promise.all([
            writeFile("package.json"),
            writeFile("webpack.config.js"),
            writeFile(`index.${moduleFormat}.js`, "index.js")
        ])
    }

    function installWebpack() {
        console.log(
            chalk.yellow(`Installing webpack@${webpackVersion}, using ${moduleFormat} modules`)
        )
        // TODO: npm? v5 was giving me issues
        return exec(`yarn add --dev webpack@${webpackVersion}`)
    }

    function execWebpack() {
        return exec(path.resolve("node_modules", ".bin", "webpack"))
    }

    const execBundle = () => {
        console.log(chalk.yellow(`Excuting bundle.js with ${process.execPath}`))
        return exec(`"${process.execPath}" bundle.js`)
    }

    function reportStatus({ stdout, stderr }) {
        console.log(chalk.red.bold("Output:"))
        console.log(stdout)
        if (stdout !== "store.count: 0\nstore.count: 1\nstore.count: 0\n") {
            return Promise.reject("Stdout from test program was not as expected:\n\n" + stdout)
        }
        console.log(chalk.green("Success"))
        return Promise.resolve()
    }

    console.log(chalk.cyan(`Running webpack build in ${buildDir}`))
    return (
        fs
            .remove(buildDir)
            // Need to wait until after I/O stuff completes or there's intermittent
            // access-denied exceptions
            .then(immediate)
            .then(initBuildFolder)
            .then(installWebpack)
            .then(execWebpack)
            .then(execBundle)
            .then(reportStatus)
    )
}

runWebpackBuild({ webpackVersion: "2", moduleFormat: "es" })
    .then(() => runWebpackBuild({ webpackVersion: "2", moduleFormat: "cjs" }))
    .then(() => runWebpackBuild({ webpackVersion: "1", moduleFormat: "cjs" }))
    .catch(e => console.error(e))
