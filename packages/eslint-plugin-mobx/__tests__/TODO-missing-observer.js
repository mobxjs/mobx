import { RuleTester } from "eslint";

import rule from "../src/missing-observer.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

tester.run("missing-observer", rule, {
  valid: [
    { code: `` },
  ],
  invalid: [],
});