import { getRuleTester } from "./utils/get-rule-tester"

import rule from "../src/exhaustive-make-observable"

const tester = getRuleTester()

const decoratedFields = [
    "@observable accessor o = 5",
    "@observableRef accessor or = []",
    "@observableShallow accessor os = []",
    "@observableDeep accessor od = {}",
    "@observableStruct accessor ost = {}",
    "@computed get c() {}",
    "@computedStruct get cs() {}",
    "@computed({ equals }) get co() {}",
    "@action a() {}",
    "@actionBound ab() {}",
    "@flow *f() {}",
    "@flowBound *fb() {}"
]

const valid1 = decoratedFields
    .map(
        field => `
class C {
  ${field}
  plain = 1

  constructor() {
    makeObservable(this, { plain: true })
  }
}
`
    )
    .map(code => ({ code }))

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
    makeObservable({}, {})
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
    errors: [{ messageId: "missingAnnotation" }],
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
    errors: [{ messageId: "missingAnnotation" }],
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
    errors: [{ messageId: "missingAnnotation" }],
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
    errors: [{ messageId: "missingAnnotation" }],
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
    errors: [{ messageId: "missingAnnotation" }],
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

const invalid6 = {
    code: `
class C {
  @observableRef accessor ref = []
  count = 0

  constructor() {
    makeObservable(this, {})
  }
}
`,
    errors: [{ messageId: "missingAnnotation" }],
    output: `
class C {
  @observableRef accessor ref = []
  count = 0

  constructor() {
    makeObservable(this, { count: true, })
  }
}
`
}

const invalid7 = {
    code: `
class C {
  @observable accessor o = 5

  constructor() {
    makeObservable(this)
  }
}
`,
    errors: [{ messageId: "missingAnnotationsArg" }],
    output: null
}

const invalid8 = {
    code: `makeObservable({})`,
    errors: [{ messageId: "missingAnnotationsArg" }],
    output: null
}

tester.run("exhaustive-make-observable", rule, {
    valid: [...valid1, valid2, valid3],
    invalid: [invalid1, invalid2, invalid3, invalid4, invalid5, invalid6, invalid7, invalid8]
})
