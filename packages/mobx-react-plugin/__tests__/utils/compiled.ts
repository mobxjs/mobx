/**
 * Every function compiled by React Compiler starts with `const $ = _c(n)`
 * (`(0, _compilerRuntime.c)(n)` after the CommonJS transform).
 */
const MEMO_CACHE_CALL = /(?:\b_c|\.c\))\(\d+\)/

/**
 * Returns the source text of the function whose header contains `header`
 * (brace matched), so assertions can target one function in a file.
 */
export function functionBody(output: string, header: string): string {
    const start = output.indexOf(header)
    if (start === -1) {
        throw new Error(`Function header not found: ${header}\n\n${output}`)
    }
    const open = output.indexOf("{", start)
    let depth = 0
    for (let i = open; i < output.length; i++) {
        if (output[i] === "{") {
            depth++
        } else if (output[i] === "}") {
            depth--
            if (depth === 0) {
                return output.slice(start, i + 1)
            }
        }
    }
    throw new Error(`Unbalanced braces after: ${header}`)
}

export function isCompiled(output: string, header: string): boolean {
    return MEMO_CACHE_CALL.test(functionBody(output, header))
}
