import { RuleTester } from "eslint";

import rule from "../src/exhaustive-make-observable.js";

//console.log();
const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    //ecmaVersion: 2021
    //lib: ['ESNext'],
    //project: require.resolve('../tsconfig.json'),

  }
});

const valid1 = `
class C {     
  @observable o = 5; 
  
  constructor() {
    makeObservable(this) 
  }      
}
`
const valid2 = `
class C {     
  @observable.shallow o = [];   
  
  constructor() {
    makeObservable(this) 
  }      
}
`
const valid3 = `
class C {     
  @action a() {};     
  
  constructor() {
    makeObservable(this) 
  }      
}
`
const valid4 = `
class C {     
  @computed() get c() {};    
  
  constructor() {
    makeObservable(this) 
  }      
}
`
const valid5 = `
class C {     
  @action.bound a() {};    
  
  constructor() {
    makeObservable(this) 
  }      
}
`
const valid6 = `
class C {     
  o = 5;  
  constructor() {
    makeObservable(this, {
      o: observable,
      a: action,
      c: computed,
    }) 
  }     
  a() {};   
  get c() {};
}
`
const invalid1 = `
class C {     
  o = 5;  
  constructor() {
    makeObservable(this, {}) 
  }     
  a() {};
  get c() {};   
}
`
const invalid2 = `
class C { 
  o = 5;    
  constructor() {
    makeObservable(this) 
  }     
  a() {}; 
  get c() {}; 
}
`
tester.run("exhaustive-make-observable", rule, {
  valid: [
    { code: valid1 },
    { code: valid2 },
    { code: valid3 },
    { code: valid4 },
    { code: valid5 },
    { code: valid6 },
  ],
  invalid: [
    {
      code: invalid1,
      errors: [
        { message: 'Missing annotation for `o`.' },
        { message: 'Missing annotation for `a`.' },
        { message: 'Missing annotation for `c`.' },
      ],
    },
    {
      code: invalid2,
      errors: [
        { message: 'Second argument must be object literal in form of `{ prop: annotation }`.' },
        { message: 'Missing annotation for `o`.' },
        { message: 'Missing annotation for `a`.' },
        { message: 'Missing annotation for `c`.' },
      ],
    },
  ],
});