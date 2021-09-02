import { RuleTester } from "eslint";

import rule from "../src/missing-make-observable.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

const fields = [
  '@observable o = 5',
  '@observable.ref or = []',
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

const valid2 = {
  code: `
class C {       
  o = 5;
  get c() {};
  a() {};
  *f() {};

  constructor() {
    makeObservable(this, {}) 
  }      
}
`
}

const valid3 = fields.map(field => `
class C {     
  ${field}

  constructor() {
    makeObservable(this, null, { name: 'foo' }) 
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
    makeObservable({ a: 5 });
  }       
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'missingMakeObservable' },
  ]
}))

const invalid4 = fields.map(field => `
class C {     
  ${field}

  constructor()
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'missingMakeObservable' },
  ]
}))


const invalid5 = fields.map(field => `
class C {     
  ${field}

  constructor() {
    makeObservable(this, { o: observable.ref });
  }       
}
`).map(code => ({
  code,
  errors: [
    { messageId: 'secondArgMustBeNullish' },
  ]
}))


tester.run("missing-make-observable", rule, {
  valid: [
    ...valid1,
    valid2,
    ...valid3,
  ],
  invalid: [
    ...invalid1,
    ...invalid2,
    ...invalid3,
    ...invalid4,
    ...invalid5,
  ],
});