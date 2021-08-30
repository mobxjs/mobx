import { RuleTester } from "eslint";

import rule from "../src/missing-make-observable.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

const fields = [
  '@observable o = 5',
  '@observable.shallow os = []',
  '@observable.deep od = {}',
  '@computed get c() {}',
  '@computed.struct get cs() {}',
  '@computed({ equals }) get co() {}',
  '@action a() {}',
  '@action.bound ab() {}',
  '@flow *f() {}',
  '@flow.bound *fb() {}',
];

const valid1 = fields.map(field => `
class C {     
  ${field}

  constructor() {
    makeObservable(this) 
  }      
}
`).map(code => ({ code }))

const invalid1 = fields.map(field => `
class C {     
  ${field}  
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'missingMakeObservable' },
  ]
}))

const invalid2 = fields.map(field => `
class C {     
  ${field}

  constructor() {}       
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'missingMakeObservable' },
  ]
}))

const invalid3 = fields.map(field => `
class C {     
  ${field}

  constructor() {
    const foo = makeObservable({ a: 5 });
  }       
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'missingMakeObservable' },
  ]
}))

tester.run("missing-make-observable", rule, {
  valid: [
    valid1[0],
    //...valid1,
  ],
  invalid: [
    invalid1[0],
    /*...invalid1,
    ...invalid2,
    ...invalid3,*/
  ],
});