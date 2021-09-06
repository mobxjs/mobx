import { RuleTester } from "eslint";

import rule from "../src/exhaustive-make-observable.js";

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {}
});

const decoratedFields = [
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

const valid1 = decoratedFields.map(field => `
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
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, {
      o: true,
      a: true,
      c: true,
      f: true,
    }) 
  }  
}
`
}

const valid3 = {
  code: `
class C {     
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable({})
  }  
}
`
}

const invalid1 = {
  code: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, {
      a: true,
      c: true,
      f: true,
    })
  }
}
`,
  errors: [{ messageId: 'missingAnnotation' }],
  output: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, { o: true, 
      a: true,
      c: true,
      f: true,
    })
  }
}
`
}

const invalid2 = {
  code: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, {
      o: true,
      c: true,
      f: true,
    })
  }
}
`,
  errors: [{ messageId: 'missingAnnotation' }],
  output: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, { a: true, 
      o: true,
      c: true,
      f: true,
    })
  }
}
`
}

const invalid3 = {
  code: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, {
      o: true,
      a: true,
      f: true,
    })
  }
}
`,
  errors: [{ messageId: 'missingAnnotation' }],
  output: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, { c: true, 
      o: true,
      a: true,
      f: true,
    })
  }
}
`
}

const invalid4 = {
  code: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, {
      o: true,
      a: true,
      c: true,
    })
  }
}
`,
  errors: [{ messageId: 'missingAnnotation' }],
  output: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, { f: true, 
      o: true,
      a: true,
      c: true,
    })
  }
}
`
}

const invalid5 = {
  code: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this)
  }
}
`,
  errors: [{ messageId: 'missingAnnotation' }],
  output: `
class C {
  o = 5
  get c() {}
  a() {}
  *f() {}
  
  constructor() {
    makeObservable(this, { o: true, c: true, a: true, f: true, })
  }
}
`
}

tester.run("exhaustive-make-observable", rule, {
  valid: [
    ...valid1,
    valid2,
    valid3,
  ],
  invalid: [
    invalid1,
    invalid2,
    invalid3,
    invalid4,
    invalid5,
  ],
});