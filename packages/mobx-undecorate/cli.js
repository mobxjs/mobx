#!/usr/bin/env node
const { spawn } = require("child_process")
const path = require("path")

// this is pretty lame, probably better make a .cmd and .sh file...
spawn(
    `node_modules${path.sep}.bin${path.sep}jscodeshift`,
    [
        "--extensions=js,jsx,ts,tsx",
        ...process.argv.filter(arg => arg.startsWith("--")),
        "-t",
        "src/undecorate.ts",
        process.cwd()
    ],
    {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    }
)
