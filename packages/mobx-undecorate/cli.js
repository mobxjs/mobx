#!/usr/bin/env node
const path = require("path")
const cp = require("child_process")
const fs = require("fs")

/**
 * @example getCommandPath("jscodeshift")
 * //-> C:\Users\name\AppData\Local\npm-cache\_npx\234242somehash\node_modules\.bin\jscodeshift.cmd
 * //-> linux/path/npm-cache/_npx/234242somehash/node_modules/.bin/jscodeshift
 */
const getCommandPath = binCommand => {
  const cmd = process.platform === 'win32' ? `${binCommand}.cmd` : binCommand;
  /**
   * Normally, for executing bins from a project you would use path.resolve(__dirname, 'node_modules', '.bin', cmd) 
   * but NPX is wierd. You might think running npx mobx-undecorate installs mobx-undecorate, BUT IT DOESNT. 
   * It creates a randomly hashed folder with an unnamed package.json with mobx-undecorate as its only dependency. 
   * This causes a flattening of all peers in the same node_modules dir.
   * They probably did it this way to dedupe nested deps.
   * 
   * This following logic checks for both folder structure and platform bin file extension.
  */
  let COMMAND_PATH_SIBLING = path.resolve(__dirname, '..', '.bin', cmd)
  let COMMAND_PATH_NESTED = path.resolve(__dirname, 'node_modules', '.bin', cmd)

  var COMMAND_PATH

  if (fs.existsSync(COMMAND_PATH_NESTED)) {
    COMMAND_PATH = COMMAND_PATH_NESTED
  }
  else if (fs.existsSync(COMMAND_PATH_SIBLING)) {
    COMMAND_PATH = COMMAND_PATH_SIBLING
  }
  else {
    throw new Error("cannot find jscodeshift path")
    process.exit(0)
  }
  return COMMAND_PATH

}

const spawnBin = (binCommand, args) => {
  return cp.spawn(getCommandPath(binCommand), args, {
    cwd: path.resolve(__dirname),
    stdio: 'inherit',
    shell: true
  })

}


if (process.argv.includes("--help")) {
  console.log(`[MOBX-UNDECORATE]:
  If experiencing problems, you may also install jscodeshift and mobx-undecorate locally and run 
  npx jscodeshift -t ./node_modules/mobx-undecorate/src/undecorate.ts --extensions=js,jsx,ts,tsx <directory>

[JSCODESHIFT HELP]:
`)
}


function interpret_cli_args() {

  //first 2 args of argv are the node.exe path and the path of this file.
  var USER_ARGS = process.argv.slice(2)

  /**
   * find args that dont include a "=" and set the input to the next index value in process.argv.
   * Gotta do this because process.argv is delimited by spaces, so --dir src is actually 2 separate args
   * so if an arg starts with -- and doesn't include a "=" 
   * we can just search for the arg by its --name and add 1 to the index position for lookup
   * This will return -1 if nothing is found
   */

  let arg_without_equal = USER_ARGS
    .slice()
    .filter(v => !v.includes("="))
    .findIndex(kwarg => (kwarg.includes("--dir") || kwarg.includes("--path")))
    ;

  var arg_with_equal = USER_ARGS
    .slice()
    .find(v => (v.includes("--dir=") || v.includes("--path=")))


  //use cwd as default, but will override it with user args if they exist for --dir or --path
  var PARSED_INPUT = ""

  let is_arg_directory_only = process.argv[2] && fs.existsSync(path.resolve(process.cwd(), (process.argv[2] || "")))

  if (is_arg_directory_only) {
    PARSED_INPUT = process.argv[2]
  }

  if (arg_without_equal > -1) {
    PARSED_INPUT = USER_ARGS[arg_without_equal + 1]
  }

  if (arg_with_equal) {
    PARSED_INPUT = arg_with_equal.split("=")[1]
  }

  return PARSED_INPUT

}


spawnBin("jscodeshift", [
  "--extensions=js,jsx,ts,tsx",
  ...process.argv.filter(arg => arg.startsWith("--")),
  "-t", `"${path.join(__dirname, "src", "undecorate.ts")}"`,

  //this is arg to tell jscodeshift the dir to transform or fallback to process.cwd()
  //originally just hard coded to process.cwd()
  `"${path.join(process.cwd(), interpret_cli_args())}"`

]);


