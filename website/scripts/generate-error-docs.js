#!/usr/bin/env node

const { readFileSync, writeFileSync } = require("fs")
const { dirname, relative, resolve } = require("path")
const Module = require("module")
const ts = require("typescript")

const repoRoot = resolve(__dirname, "../..")
const errorsPath = resolve(repoRoot, "packages/mobx/src/errors.ts")
const outputPath = resolve(repoRoot, "docs/errors.md")

globalThis.__DEV__ = true

// errors.ts is TypeScript source, so strip the types and evaluate it as CommonJS
// instead of relying on Node's require, which can't parse `export`/type syntax.
function loadErrorsModule(tsPath) {
    const { outputText } = ts.transpileModule(readFileSync(tsPath, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
        fileName: tsPath
    })
    const compiled = new Module(tsPath, module)
    compiled.filename = tsPath
    compiled.paths = Module._nodeModulePaths(dirname(tsPath))
    compiled._compile(outputText, tsPath)
    return compiled.exports
}

const { niceErrors } = loadErrorsModule(errorsPath)

function formatMarkdownCell(message) {
    let value = message

    if (typeof message === "function") {
        // Render dynamic errors with visible placeholders instead of real runtime values
        const match = message.toString().match(/^[^(]*\(([^)]*)\)/)
        const params = match ? match[1] : ""
        const names = params.split(",").map(name => name.trim()).filter(Boolean)
        const args = names.map(name => `{${name}}`)
        value = message(...args).replace("String", args[0])
    }

    // Keep the generated table valid Markdown
    return String(value).replace(/\r?\n/g, "<br />").replace(/\|/g, "\\|")
}

function renderDocs(errors) {
    const rows = Object.keys(errors)
        .sort((left, right) => Number(left) - Number(right))
        .map(code => `| ${code} | ${formatMarkdownCell(errors[code])} |`)
        .join("\n")

    return `---
title: MobX error codes
sidebar_label: Error codes
hide_title: true
custom_edit_url: https://github.com/mobxjs/mobx/edit/main/packages/mobx/src/errors.ts
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX error codes

In development builds, MobX throws full error messages. Production builds replace known messages with short numeric codes to keep the published bundle smaller.

| Code | Message |
| ---- | ------- |
${rows}
`
}

const docs = renderDocs(niceErrors)
writeFileSync(outputPath, docs)

console.log(`Generated ${relative(repoRoot, outputPath)} from ${relative(repoRoot, errorsPath)}`)
