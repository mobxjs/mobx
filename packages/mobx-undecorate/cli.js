#!/usr/bin/env node
const { spawn } = require("child_process")
const { resolve } = require("path")

// this is pretty lame, probably better make a .cmd and .sh file...
spawn(
    "node_modules/.bin/jscodeshift",
    [...process.argv.filter(arg => arg.startsWith("--")), "-t", "src/undecorate.ts", process.cwd()],
    {
        cwd: __dirname,
        stdio: "inherit"
    }
)
