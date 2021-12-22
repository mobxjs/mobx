import { RuleTester } from "eslint";

import rule from "../src/no-anonymous-observer.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

tester.run("no-anonymous-observer", rule, {
  valid: [
    { code: `` },
  ],
  invalid: [],
});