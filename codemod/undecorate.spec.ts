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
                                    "import { observable, makeObservable } from \\"mobx\\";
                                    
                                    class Box {
                                        /*0*/
                                        /*1*/
                                        field /*2 */ = /*3*/ 1; /*4*/
                                    
                                        constructor() {
                                            makeObservable(this, {
                                                field: observable
                                            });
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
                                                "import { observable, makeObservable } from \\"mobx\\";
                                                
                                                class ExtendsHasMethod extends Box {
                                                    x = 1;
                                                
                                                    constructor() {
                                                        super();
                                                
                                                        makeObservable(this, {
                                                            x: observable
                                                        });
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
                                                "import { observable, makeObservable } from \\"mobx\\";
                                                
                                                class ExtendsHasConstructor {
                                                    x = 1;
                                                
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: observable
                                                        });
                                                
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
                                                "import { observable, makeObservable } from \\"mobx\\";
                                                
                                                class ExtendsHasConstructorSuper extends Box {
                                                    x = 1;
                                                
                                                    constructor() {
                                                        super()
                                                
                                                        makeObservable(this, {
                                                            x: observable
                                                        });
                                                
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    x = (arg: number) => {
                                                        console.log('hi')
                                                    };
                                                
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action.bound(\\"test\\")
                                                        });
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action.bound(\\"test\\")
                                                        });
                                                    }
                                                
                                                    async x(arg: number): boolean {
                                                        console.log('hi')
                                                        return true
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action.bound(\\"test\\")
                                                        });
                                                    }
                                                
                                                    *x(arg: number): boolean {
                                                        console.log('hi')
                                                        return true
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    x = async (arg: number): boolean => {
                                                        console.log('hi')
                                                        return true
                                                    };
                                                
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action(\\"test\\")
                                                        });
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    x = (arg: number): boolean => {
                                                        console.log('hi')
                                                        return true
                                                    };
                                                
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action
                                                        });
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action.bound
                                                        });
                                                    }
                                                
                                                    x(arg: number): boolean {
                                                        console.log('hi')
                                                        return true
                                                    }
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action(\\"test\\")
                                                        });
                                                    }
                                                
                                                    x(arg: number): boolean {
                                                        console.log('hi')
                                                        return true
                                                    }
                                                }"
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
                                                "import { action, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: action
                                                        });
                                                    }
                                                
                                                    x(arg: number): boolean {
                                                        console.log('hi')
                                                        return true
                                                    }
                                                }"
                                `)
    })

    test("method - unbound - computed name", () => {
        expect(
            convert(`
            import { action } from "mobx"
            
            class Box {
                @action
                ['x' + 'y'](arg: number): boolean {
                    console.log('hi')
                    return true
                }
            }
            `)
        ).toMatchInlineSnapshot(`
                        "import { action, makeObservable } from \\"mobx\\";
                        
                        class Box {
                            constructor() {
                                makeObservable(this, {
                                    ['x' + 'y']: action
                                });
                            }
                        
                            ['x' + 'y'](arg: number): boolean {
                                console.log('hi')
                                return true
                            }
                        }"
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
                                                "import { observable, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    x = 1;
                                                
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: observable
                                                        });
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
                                                "import { observable, makeObservable } from \\"mobx\\";
                                                
                                                      class Box {
                                                        x = 1;
                                                
                                                        constructor() {
                                                          makeObservable(this, {
                                                            x: observable.shallow
                                                          });
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
                                    "import { observable, makeObservable } from \\"mobx\\";
                                    
                                          class Box {
                                            ['x'] = 1;
                                    
                                            constructor() {
                                              makeObservable(this, {
                                                [\\"x\\"]: observable.shallow
                                              });
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
                                                "import { computed, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: computed
                                                        });
                                                    }
                                                
                                                    get x() {
                                                        return 1;
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
                                                "import { computed, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: computed
                                                        });
                                                    }
                                                
                                                    get x() {
                                                        return 1;
                                                    }
                                                    set x(v) {
                                                        console.log(v)
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
                                                "import { computed, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: computed({ name: \\"test\\" })
                                                        });
                                                    }
                                                
                                                    get x() {
                                                        return 1;
                                                    }
                                                    set y(z) {
                                                        console.log(\\"wrong\\");
                                                    }
                                                    set x(v) {
                                                        console.log(v)
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
                                                "import { computed, makeObservable } from \\"mobx\\";
                                                
                                                class Box {
                                                    constructor() {
                                                        makeObservable(this, {
                                                            x: computed.struct
                                                        });
                                                    }
                                                
                                                    get x() {
                                                        return 1;
                                                    }
                                                    set x(v) {
                                                        console.log(v)
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
                                                            "import { observable, computed, action, makeObservable } from \\"mobx\\"
                                                            
                                                                class Box {
                                                                    width = 3;
                                                                    height = 2;
                                                            
                                                                    constructor() {
                                                                        makeObservable(this, {
                                                                            width: observable,
                                                                            height: observable.shallow,
                                                                            size: computed,
                                                                            double: action
                                                                        });
                                                                    }
                                                            
                                                                    // gets the size of the thing
                                                                    get size() {
                                                                        return this.width * this.height
                                                                    }
                                                            
                                                                    // make it twice as large
                                                                    double() {
                                                                        this.width *= 2;
                                                                    }
                                                                }"
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
                                                            "import { observable, computed, action, makeObservable } from \\"mobx\\"
                                                                
                                                                    test(\\"a\\", () => {
                                                                        class Box {
                                                                            width = 3;
                                                            
                                                                            constructor() {
                                                                                makeObservable(this, {
                                                                                    width: observable
                                                                                });
                                                                            }
                                                                        }
                                                                    })
                                                            
                                                                    test(\\"b\\", () => {
                                                                        class Box {
                                                                            constructor() {
                                                                                makeObservable(this, {
                                                                                    method: action
                                                                                });
                                                                            }
                                                            
                                                                            method() {}
                                                                        }
                                                                    })"
                                        `)
    })

    test("handle undeclared observable members", () => {
        expect(
            convert(`
            import { observable, decorate, computed, action } from "mobx"
        
            class Box {
                
            }

            decorate(Box, {
                width: observable,
                height: observable.shallow,
            })
        `)
        ).toMatchInlineSnapshot(`
                                                            "import { observable, computed, action, makeObservable } from \\"mobx\\"
                                                            
                                                                class Box {
                                                                    width;
                                                                    height;
                                                            
                                                                    constructor() {
                                                                        makeObservable(this, {
                                                                            width: observable,
                                                                            height: observable.shallow
                                                                        });
                                                                    }
                                                                }"
                                        `)
    })

    test("handle non-classes", () => {
        expect(
            convert(`
            import { observable, decorate, computed, action } from "mobx"
        
            const box = {
                
            }

            decorate(box, {
                width: observable,
                height: observable.shallow,
            })
        `)
        ).toMatchInlineSnapshot(`
            "import { observable, computed, action } from \\"mobx\\";
            
                const box = {
                    
                }
            
                makeObservable(box, {
                    width: observable,
                    height: observable.shallow,
                })"
        `)
    })
})
