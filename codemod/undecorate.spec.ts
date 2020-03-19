import { applyTransform } from "jscodeshift/dist/testUtils"
const dedent = require("dedent-js")
import * as u from "./undecorate"

function convert(source: string): string {
    return applyTransform(u, {}, { source: dedent(source), path: "unittest" }, {})
}

describe("general", () => {
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
})

describe.only("action", () => {
    test("field - bound - named", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action.bound("test")
                x = (arg: number) => {
                    console.log('hi')
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                    "import { action } from \\"mobx\\"
                                    
                                    class Box {
                                        x = action(\\"test\\", (arg: number) => {
                                            console.log('hi')
                                        });
                                    }"
                        `)
    })

    test("method - bound - named", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action.bound("test")
                async x(arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                    "import { action } from \\"mobx\\"
                                    
                                    class Box {
                                        x = action(\\"test\\", async (arg: number): boolean => {
                                            console.log('hi')
                                            return true
                                        });
                                    }"
                        `)
    })

    test("method - bound - named - generator", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action.bound("test")
                * x(arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                                                                    "import { action } from \\"mobx\\"
                                                                                    
                                                                                    class Box {
                                                                                        x = action.bound(\\"test\\", function*(arg: number): boolean {
                                                                                            console.log('hi')
                                                                                            return true
                                                                                        });
                                                                                    }"
                                                        `)
    })

    test("field - named", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action("test")
                x = async (arg: number): boolean => {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                                "import { action } from \\"mobx\\"
                                                
                                                class Box {
                                                    x = action(\\"test\\", async (arg: number): boolean => {
                                                        console.log('hi')
                                                        return true
                                                    });
                                                }"
                                `)
    })

    test("field - unnamed", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action
                x = (arg: number): boolean => {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                                "import { action } from \\"mobx\\"
                                                
                                                class Box {
                                                    x = action((arg: number): boolean => {
                                                        console.log('hi')
                                                        return true
                                                    });
                                                }"
                                `)
    })

    test("method - bound - unnamed", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action.bound
                x (arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                                                "import { action } from \\"mobx\\"
                                                
                                                class Box {
                                                    x = action((arg: number): boolean => {
                                                        console.log('hi')
                                                        return true
                                                    });
                                                }"
                                `)
    })

    test("method - unbound - named", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action("test")
                x (arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
            "import { action } from \\"mobx\\"
            
            class Box {
                x(arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            Box.prototype.x = action(\\"test\\", Box.prototype.x);"
        `)
    })

    test("method - unbound - unnamed", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action
                x (arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                        "import { action } from \\"mobx\\"
                        
                        class Box {
                            x(arg: number): boolean {
                                console.log('hi')
                                return true
                            }
                        }
                        Box.prototype.x = action(Box.prototype.x);"
                `)
    })

    test("method - unbound - computed name", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action
                ['x'](arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                        "import { action } from \\"mobx\\"
                        
                        class Box {
                            ['x'](arg: number): boolean {
                                console.log('hi')
                                return true
                            }
                        }
                        Box.prototype['x'] = action(Box.prototype['x']);"
                `)
    })
})
