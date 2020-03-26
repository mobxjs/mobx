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

describe("action", () => {
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

describe("observable", () => {
    test("observable ", () => {
        expect(
            convert(`
      import { observable } from "mobx"

      class Box {
          @observable x = 1
      }
    `)
        ).toMatchInlineSnapshot(`
                                                                                                                                                                        "import { observable, initializeObservables } from \\"mobx\\";
                                                                                                                                                                        
                                                                                                                                                                        class Box {
                                                                                                                                                                            x = observable(1);
                                                                                                                                                                        
                                                                                                                                                                            constructor() {
                                                                                                                                                                                initializeObservables(this);
                                                                                                                                                                            }
                                                                                                                                                                        }"
                                                                                                                `)
    })

    test("observable - shallow ", () => {
        expect(
            convert(`
          import { observable } from "mobx"
    
          class Box {
            @observable.shallow x = 1
        }
        `)
        ).toMatchInlineSnapshot(`
                                                                                                                                                                        "import { observable, initializeObservables } from \\"mobx\\";
                                                                                                                                                                        
                                                                                                                                                                              class Box {
                                                                                                                                                                                x = observable.shallow(1);
                                                                                                                                                                        
                                                                                                                                                                                constructor() {
                                                                                                                                                                                  initializeObservables(this);
                                                                                                                                                                                }
                                                                                                                                                                              }"
                                                                                                                `)
    })

    test("observable - shallow - computed name ", () => {
        expect(
            convert(`
              import { observable } from "mobx"
        
              class Box {
                @observable.shallow ['x'] = 1
            }
            `)
        ).toMatchInlineSnapshot(`
                                                                                                                                                                        "import { observable, initializeObservables } from \\"mobx\\";
                                                                                                                                                                        
                                                                                                                                                                              class Box {
                                                                                                                                                                                ['x'] = observable.shallow(1);
                                                                                                                                                                        
                                                                                                                                                                                constructor() {
                                                                                                                                                                                  initializeObservables(this);
                                                                                                                                                                                }
                                                                                                                                                                              }"
                                                                                                                `)
    })
})

describe("computed", () => {
    test("computed ", () => {
        expect(
            convert(`
      import { computed } from "mobx"

      class Box {
          @computed get x() {
              return 1;
          }
      }
    `)
        ).toMatchInlineSnapshot(`
                                                                                    "import { computed, initializeObservables } from \\"mobx\\";
                                                                                    
                                                                                    class Box {
                                                                                        x = computed(() => {
                                                                                            return 1;
                                                                                        });
                                                                                    
                                                                                        constructor() {
                                                                                            initializeObservables(this);
                                                                                        }
                                                                                    }"
                                                        `)
    })

    test("computed - setter", () => {
        expect(
            convert(`
      import { computed } from "mobx"

      class Box {
          @computed get x() {
              return 1;
          }
          set x(v) {
              console.log(v)
          }
      }
    `)
        ).toMatchInlineSnapshot(`
                                                                                    "import { computed, initializeObservables } from \\"mobx\\";
                                                                                    
                                                                                    class Box {
                                                                                        x = computed(() => {
                                                                                            return 1;
                                                                                        }, v => {
                                                                                            console.log(v)
                                                                                        });
                                                                                    
                                                                                        constructor() {
                                                                                            initializeObservables(this);
                                                                                        }
                                                                                    }"
                                                        `)
    })

    test("computed - setter - options", () => {
        expect(
            convert(`
      import { computed } from "mobx"

      class Box {
          @computed({ name: "test" }) get x() {
              return 1;
          }
          set y(z) {
              console.log("wrong");
          }
          set x(v) {
              console.log(v)
          }
      }
    `)
        ).toMatchInlineSnapshot(`
                                                                                    "import { computed, initializeObservables } from \\"mobx\\";
                                                                                    
                                                                                    class Box {
                                                                                        x = computed(() => {
                                                                                            return 1;
                                                                                        }, v => {
                                                                                            console.log(v)
                                                                                        }, { name: \\"test\\" });
                                                                                    
                                                                                        constructor() {
                                                                                            initializeObservables(this);
                                                                                        }
                                                                                    
                                                                                        set y(z) {
                                                                                            console.log(\\"wrong\\");
                                                                                        }
                                                                                    }"
                                                        `)
    })

    test("computed - setter - struct", () => {
        expect(
            convert(`
      import { computed } from "mobx"

      class Box {
          @computed.struct get x() {
              return 1;
          }
          set x(v) {
              console.log(v)
          }
      }
    `)
        ).toMatchInlineSnapshot(`
                                                                        "import { computed, initializeObservables } from \\"mobx\\";
                                                                        
                                                                        class Box {
                                                                            x = computed.struct(() => {
                                                                                return 1;
                                                                            }, v => {
                                                                                console.log(v)
                                                                            });
                                                                        
                                                                            constructor() {
                                                                                initializeObservables(this);
                                                                            }
                                                                        }"
                                                `)
    })
})

describe("decorate", () => {
    test("basic", () => {
        expect(
            convert(`
            import { observable, decorate, computed, action } from "mobx"
        
            class Box {
                width = 3
                height = 2

                // gets the size of the thing
                get size() {
                    return this.width * this.height
                }

                // make it twice as large
                double() {
                    this.width *= 2;
                }
            }

            decorate(Box, {
                width: observable,
                height: observable.shallow,
                size: computed,
                double: action
            })
        `)
        ).toMatchInlineSnapshot(`
                        "import { observable, decorate, computed, action, initializeObservables } from \\"mobx\\";
                        
                            class Box {
                                width = observable(3);
                                height = observable.shallow(2);
                        
                                // gets the size of the thing
                                size = computed(() => {
                                    return this.width * this.height
                                });
                        
                                constructor() {
                                    initializeObservables(this);
                                }
                        
                                // make it twice as large
                                double() {
                                    this.width *= 2;
                                }
                            }
                        
                            Box.prototype.double = action(Box.prototype.double);"
                `)
    })

    test("multiple targets", () => {
        expect(
            convert(`
            import { observable, decorate, computed, action } from "mobx"
        
            test("a", () => {
                class Box {
                    width = 3
                }
    
                decorate(Box, {
                    width: observable,
                })
            })

            test("b", () => {
                class Box {
                    method() {}
                }
    
                decorate(Box, {
                    method: action
                })
            })
        `)
        ).toMatchInlineSnapshot(`
            "import { observable, decorate, computed, action, initializeObservables } from \\"mobx\\";
                
                    test(\\"a\\", () => {
                        class Box {
                            width = observable(3);
            
                            constructor() {
                                initializeObservables(this);
                            }
                        }
                    })
            
                    test(\\"b\\", () => {
                        class Box {
                            method() {}
                        }
            
                        Box.prototype.method = action(Box.prototype.method);
                    })"
        `)
    })
})
