#!/usr/bin/env node

const { writeFileSync } = require("fs")
const { relative, resolve } = require("path")

const repoRoot = resolve(__dirname, "../..")
const errorsPath = resolve(repoRoot, "packages/mobx/src/errors.ts")
const outputPath = resolve(repoRoot, "docs/errors.md")

globalThis.__DEV__ = true
const { niceErrors } = require(errorsPath)

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
