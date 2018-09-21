/* Publish.js, publish a new version of the npm package as found in the current directory */
/* Run this file from the root of the repository */

const shell = require("shelljs")
const fs = require("fs")
const readline = require("readline")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function run(command, options) {
    const continueOnErrors = options && options.continueOnErrors
    const ret = shell.exec(command, options)
    if (!continueOnErrors && ret.code !== 0) {
        shell.exit(1)
    }
    return ret
}

function exit(code, msg) {
    console.error(msg)
    shell.exit(code)
}

async function prompt(question, defaultValue) {
    return new Promise(resolve => {
        rl.question(`${question} [${defaultValue}]: `, answer => {
            answer = answer && answer.trim()
            resolve(answer ? answer : defaultValue)
        })
    })
}

async function main() {
    // build
    run("npm run small-build")

    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))

    // Bump version number
    let nrs = pkg.version.split(".")
    nrs[2] = 1 + parseInt(nrs[2], 10)
    const version = (pkg.version = await prompt(
        "Please specify the new package version of '" + pkg.name + "' (Ctrl^C to abort)",
        nrs.join(".")
    ))
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
        exit(1, "Invalid semantic version: " + version)
    }

    // Check registry data
    const npmInfoRet = run(`npm info ${pkg.name} --json`, {
        continueOnErrors: true,
        silent: true
    })
    if (npmInfoRet.code === 0) {
        //package is registered in npm?
        var publishedPackageInfo = JSON.parse(npmInfoRet.stdout)
        if (
            publishedPackageInfo.versions == version ||
            publishedPackageInfo.versions.includes(version)
        ) {
            exit(2, "Version " + pkg.version + " is already published to npm")
        }

        fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2), "utf8")

        // Finally, commit and publish!
        run("npm publish")
        run(`git commit -am "Published version ${version}"`)
        run(`git tag ${version}`)

        run("git push")
        run("git push --tags")
        console.log("Published!")
    } else {
        exit(1, pkg.name + " is not an existing npm package")
    }
}

main().catch(e => {
    throw e
})
