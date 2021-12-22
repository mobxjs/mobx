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

const valid4 = fields.map(field => `
class C {     
  ${field}

  constructor(aString: string);
  constructor(aNum: number);
  constructor(stringOrNum: string | number) {
    makeObservable(this, null, { name: 'foo' }) 
  }      
}
`).map(code => ({ code }))

const invalid1 = fields.map(field => ({
  code: `
class C {
  ${field}
}
`,
  errors: [
    { messageId: 'missingMakeObservable' },
  ],
  output: `
class C {
constructor() { makeObservable(this); }
  ${field}
}
`
}))

const invalid2 = fields.map(field => ({
  code: `
class C {
  ${field}
  constructor() {}
}
`,
  errors: [
    { messageId: 'missingMakeObservable' },
  ],
  output: `
class C {
  ${field}
  constructor() {;makeObservable(this);}
}
`,
}))

const invalid3 = fields.map(field => ({
  code: `
class C {
  ${field}
  constructor() {
    makeObservable({ a: 5 });
  }
}
`,
  errors: [
    { messageId: 'missingMakeObservable' },
  ],
  output: `
class C {
  ${field}
  constructor() {
    makeObservable({ a: 5 });
  ;makeObservable(this);}
}
`,
}))

const invalid4 = fields.map(field => ({
  code: `
class C {
  ${field}
  constructor()
}
`,
  errors: [
    { messageId: 'missingMakeObservable' },
  ],
  output: `
class C {
  ${field}
  constructor() { makeObservable(this); }
}
`,
}))


const invalid5 = fields.map(field => ({
  code: `
class C {
  ${field}
  constructor() {
    makeObservable(this, { o: observable.ref });
  }
}
`,
  errors: [
    { messageId: 'secondArgMustBeNullish' },
  ],
}))


tester.run("missing-make-observable", rule, {
  valid: [
    ...valid1,
    valid2,
    ...valid3,
    ...valid4,
  ],
  invalid: [
    ...invalid1,
    ...invalid2,
    ...invalid3,
    ...invalid4,
    ...invalid5,
  ],
});