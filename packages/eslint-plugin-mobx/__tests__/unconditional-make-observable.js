import { RuleTester } from "eslint";

import rule from "../src/unconditional-make-observable.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

const valid1 = {
  code: `
class C {
  constructor() {
    makeObservable()
    makeObservable({})
    makeObservable(this)
    function f() {
      makeObservable(this, {});
    }
    const ff = function () {
      makeObservable(this, {});
    }
  }    
}
`
}

const invalid1 = {
  code: `
class C {
  constructor() {    
    if (true) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    for (let i = 0; i < 1; i++) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    while (Math.random() > 1) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    const a = () => {
      makeObservable(this, {});
    }
  }    
}
`,
  errors: [
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
    { messageId: 'mustCallUnconditionally' },
  ],
}

tester.run("unconditional-make-observable", rule, {
  valid: [
    valid1,
  ],
  invalid: [
    invalid1
  ],
});