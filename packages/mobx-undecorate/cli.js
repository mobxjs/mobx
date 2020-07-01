#!/usr/bin/env node
import { spawn } from "child_process"

// this is pretty lame, probably better make a .cmd and .sh file...
spawn(
    "node_modules/.bin/codeshift",
    [
        "-t",
        "src/undecorate.ts",
        process.cwd(),
        ...process.argv.filter(arg => arg.startsWith("--")).join(" ")
    ],
    {
        cwd: __dirname,
        stdio: "inherit"
    }
)
