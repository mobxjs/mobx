#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))
const errorsPath = fileURLToPath(new URL("../../packages/mobx/src/errors.ts", import.meta.url))
const outputPath = fileURLToPath(new URL("../../docs/errors.md", import.meta.url))

function readNiceErrors() {
    const source = readFileSync(errorsPath, "utf8")
    const match = source.match(/const niceErrors = ([\s\S]*?) as const/)

    if (!match) {
        throw new Error(`Could not find niceErrors in ${errorsPath}`)
    }

    const objectLiteral = match[1].replace(": PropertyKey", "")
    return eval(`(${objectLiteral})`)
}

function getParamNames(fn) {
    const match = fn.toString().match(/^[^(]*\(([^)]*)\)/)
    return match ? match[1].split(",").map(name => name.trim()).filter(Boolean) : []
}

function renderMessage(message) {
    if (typeof message !== "function") {
        return message
    }

    const args = getParamNames(message).map(name => `{${name}}`)
    return message(...args).replace("String", args[0])
}

function escapeMarkdownTableCell(value) {
    return String(value).replace(/\r?\n/g, "<br />").replace(/\|/g, "\\|")
}

function renderDocs(errors) {
    const rows = Object.keys(errors)
        .sort((left, right) => Number(left) - Number(right))
        .map(code => `| ${code} | ${escapeMarkdownTableCell(renderMessage(errors[code]))} |`)
        .join("\n")

    return `---
title: MobX error codes
sidebar_label: Error codes
hide_title: true
custom_edit_url: https://github.com/mobxjs/mobx/edit/main/packages/mobx/src/errors.ts
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX error codes

In development builds, MobX throws full error messages. Production builds replace known messages with short numeric codes to keep the published bundle small.

| Code | Message |
| ---- | ------- |
${rows}
`
}

const docs = renderDocs(readNiceErrors())
writeFileSync(outputPath, docs)

console.log(`Generated ${relative(repoRoot, outputPath)} from ${relative(repoRoot, errorsPath)}`)
