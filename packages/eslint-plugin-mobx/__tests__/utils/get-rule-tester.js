const { RuleTester } = require(`eslint-${global.ESLINT_V}`);
const typescriptEslintParser = require("@typescript-eslint/parser");

function getRuleTester() {
    return new RuleTester({
        languageOptions: {
            parser: typescriptEslintParser,
            parserOptions: {},
        },
    });
}

export { getRuleTester }
