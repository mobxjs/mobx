const { Linter } = require(`eslint-${global.ESLINT_V}`)
const typescriptEslintParser = require("@typescript-eslint/parser")
const plugin = require("../src")

test("configs.recommended is a flat config that enables the recommended rules", () => {
    const code = `
class Store {
    constructor() {
        if (cond) makeObservable(this, {})
    }
}
const Cmp = () => null
`
    const messages = new Linter().verify(code, [
        plugin.configs.recommended,
        { languageOptions: { parser: typescriptEslintParser } }
    ])
    expect(messages.map(m => [m.ruleId, m.severity])).toEqual([
        ["mobx/unconditional-make-observable", 2],
        ["mobx/missing-observer", 1]
    ])
})
