import { applyTransform } from "jscodeshift/dist/testUtils"
const dedent = require("dedent-js")
import * as u from "./undecorate"

function convert(source: string): string {
    return applyTransform(u, {}, { source: dedent(source), path: "unittest" }, {})
}

test("basic observable", () => {
    expect(
        convert(`import { observable } from "mobx"

  class Box {
      /*0*/
      @observable
      /*1*/
      field /*2 */ = /*3*/ 1 /*4*/
  }`)
    ).toMatchInlineSnapshot(`
        "import { observable, initializeObservables } from \\"mobx\\";
        
        class Box {
            /*0*/
            /*1*/
            field /*2 */ = observable(/*3*/ 1); /*4*/
        
            constructor() {
                initializeObservables(this);
            }
        }"
    `)
})

test("class with method and extends", () => {
    expect(
        convert(`
          import { observable } from "mobx"

          class ExtendsHasMethod extends Box {
              @observable x = 1

              // test
              method() {
                  console.log("hi")
              }
          }
        `)
    ).toMatchInlineSnapshot(`
        "import { observable, initializeObservables } from \\"mobx\\";
        
        class ExtendsHasMethod extends Box {
            x = observable(1);
        
            constructor() {
                super();
                initializeObservables(this);
            }
        
            // test
            method() {
                console.log(\\"hi\\")
            }
        }"
    `)
})

test("class with constructor", () => {
    expect(
        convert(`
          import { observable } from "mobx"

          class ExtendsHasConstructor {
              @observable x = 1

              constructor() {
                  console.log("hi")
              }
          }`)
    ).toMatchInlineSnapshot(`
        "import { observable, initializeObservables } from \\"mobx\\";
        
        class ExtendsHasConstructor {
            x = observable(1);
        
            constructor() {
                initializeObservables(this);
                console.log(\\"hi\\")
            }
        }"
    `)
})

test("extended class with constructor", () => {
    expect(
        convert(`
          import { observable } from "mobx"

          class ExtendsHasConstructorSuper extends Box {
              @observable x = 1

              constructor() {
                  super()
                  console.log("hi")
              }
          }
        `)
    ).toMatchInlineSnapshot(`
        "import { observable, initializeObservables } from \\"mobx\\";
        
        class ExtendsHasConstructorSuper extends Box {
            x = observable(1);
        
            constructor() {
                super()
                initializeObservables(this);
                console.log(\\"hi\\")
            }
        }"
    `)
})
