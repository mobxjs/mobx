const version = global.ESLINT_V;

const { RuleTester } = require(`eslint-${version}`);
const typescriptEslintParser = require("@typescript-eslint/parser");

function getRuleTesterConfig() {
    switch (version) {
        case 7:
            return {
                parser: require.resolve("@typescript-eslint/parser"),
                parserOptions: {},
            };
        case 9:
            return {
                languageOptions: {
                    parser: typescriptEslintParser,
                    parserOptions: {},
                },
            };
        default:
            throw new Error(`Unknown or unspecified ESLINT_V (${String(version)})`);
    }
}

function getRuleTester() {
    return new RuleTester(getRuleTesterConfig());
}

export { getRuleTester }