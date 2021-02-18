#!/usr/bin/env node
const { spawn } = require("child_process")

if (process.argv.includes("--help")) {
    console.log(`[MOBX-UNDECORATE]:
  If experiencing problems, you may also install jscodeshift and mobx-undecorate locally and run 
  npx jscodeshift -t ./node_modules/mobx-undecorate/src/undecorate.ts --extensions=js,jsx,ts,tsx <directory>

[JSCODESHIFT HELP]:
`)
}

spawn(
    "jscodeshift",
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
