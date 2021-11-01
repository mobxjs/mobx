import { applyTransform } from "jscodeshift/dist/testUtils"
const dedent = require("dedent-js")
import * as u from "../src/undecorate"

function convert(
    source: string,
    options: {
        ignoreImports?: boolean
        keepDecorators?: boolean
        decoratorsAfterExport?: boolean
    } = {}
): string {
    return applyTransform(u, options, { source: dedent(source), path: "unittest" }, {})
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

    test("basic observable - skip imports", () => {
        expect(
            convert(
                `
  class Box {
      /*0*/
      @observable
      /*1*/
      field /*2 */ = /*3*/ 1 /*4*/
  }`,
                { ignoreImports: true }
            )
        ).toMatchInlineSnapshot(`
            "class Box {
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

    test("basic observable - skip imports - keepDecorators", () => {
        expect(
            convert(
                `
  class Box {
      /*0*/
      @observable
      /*1*/
      field /*2 */ = /*3*/ 1 /*4*/
  }`,
                { ignoreImports: true, keepDecorators: true }
            )
        ).toMatchInlineSnapshot(`
            "class Box {
                /*0*/
                @observable
                /*1*/
                field /*2 */ = /*3*/ 1 /*4*/

                constructor() {
                    makeObservable(this);
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
                    // TODO: [mobx-undecorate] verify the constructor arguments and the arguments of this automatically generated super call
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
                width = 3
                height = 2

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
                    width = 3

                    constructor() {
                        makeObservable(this, {
                            width: observable,
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
                // stuff
                width: observable,
                height: observable.shallow,
            })
        `)
        ).toMatchInlineSnapshot(`
            "import { observable, computed, action, makeObservable } from \\"mobx\\"

            class Box {
                constructor() {
                    makeObservable(this, {
                        // stuff
                        width: observable,
                        height: observable.shallow,
                    });
                }
            }"
        `)
    })

    test("handle non-classes - 1", () => {
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
            "import { observable, computed, action, makeObservable } from \\"mobx\\"

            const box = {

            }

            makeObservable(box, {
                width: observable,
                height: observable.shallow,
            })"
        `)
    })

    test("handle non-classes - 2", () => {
        expect(
            convert(`
            import { observable, decorate, computed, action } from "mobx"

            decorate({}, {
                width: observable,
                height: observable.shallow,
            })
        `)
        ).toMatchInlineSnapshot(`
                        "import { observable, computed, action, makeObservable } from \\"mobx\\"

                        makeObservable({}, {
                            width: observable,
                            height: observable.shallow,
                        })"
                `)
    })
})

describe("privates", () => {
    test("create generic arguments for makeObservable", () => {
        expect(
            convert(
                `
                import { observable, decorate, computed, action } from "mobx"
    
    class TryToGetThis {
        @observable
        private privateField1: number = 1
        @observable
        protected privateField2 = 1
        @observable
        public publicField: string = "test"
      }
                `
            )
        ).toMatchInlineSnapshot(`
            "import { observable, computed, action, makeObservable } from \\"mobx\\"

            class TryToGetThis {
                        private privateField1: number = 1;
                        protected privateField2 = 1;
                        public publicField: string = \\"test\\";

                        constructor() {
                                    makeObservable<TryToGetThis, \\"privateField1\\" | \\"privateField2\\">(this, {
                                                privateField1: observable,
                                                privateField2: observable,
                                                publicField: observable
                                    });
                        }
            }"
        `)
    })

    test("do not create generic arguments for makeObservable - keepDecorators", () => {
        expect(
            convert(
                `
                import { observable, decorate, computed, action } from "mobx"
    
    class TryToGetThis {
        @observable
        private privateField1: number = 1
        @observable
        protected privateField2 = 1
        @observable
        public publicField: string = "test"
      }
                `,
                {
                    keepDecorators: true
                }
            )
        ).toMatchInlineSnapshot(`
            "import { observable, computed, action, makeObservable } from \\"mobx\\"

            class TryToGetThis {
                        @observable
                        private privateField1: number = 1
                        @observable
                        protected privateField2 = 1
                        @observable
                        public publicField: string = \\"test\\"

                        constructor() {
                                    makeObservable(this);
                        }
            }"
        `)
    })
})

describe("@observer", () => {
    test("class comp", () => {
        expect(
            convert(`
        import {observer} from 'mobx-react'

        /* 1 */
        @observer /* 2 */ class X extends React.Component {
            render() {
                return <div>hi</div>
            }
        }

        `)
        ).toMatchInlineSnapshot(`
            "import {observer} from 'mobx-react'

            /* 1 */
            const X = observer(class /* 2 */ X extends React.Component {
                render() {
                    return <div>hi</div>
                }
            });"
        `)
    })

    test("class comp with export before", () => {
        expect(
            convert(`
        import {observer} from 'mobx-react-lite'


        /* 1 */
        @observer /* 2 */ export /* 3 */ class X extends React.Component {

        }

        `)
        ).toMatchInlineSnapshot(`
            "import {observer} from 'mobx-react-lite'


            /* 1 */
            export const X = observer(class /* 2 */ /* 3 */ X extends React.Component {

            });"
        `)
    })

    test("class comp with export after", () => {
        expect(
            convert(
                `
        import {observer} from 'mobx-react-lite'


        /* 1 */
        export /* 2 */ @observer /* 3 */ class X extends React.Component {

        }

        `,
                { decoratorsAfterExport: true }
            )
        ).toMatchInlineSnapshot(`
            "import {observer} from 'mobx-react-lite'


            /* 1 */
            export const X = observer(class /* 2 */ /* 3 */ X extends React.Component {

            });"
        `)
    })

    test("class comp with inject", () => {
        expect(
            convert(`
        import {observer, inject} from 'mobx-react'


        /* 1 */
        @inject("test") /* 2 */ export /* 3 */ class X extends React.Component {

        }

        `)
        ).toMatchInlineSnapshot(`
            "import {observer, inject} from 'mobx-react'


            /* 1 */
            export const X = inject(\\"test\\")(class /* 2 */ /* 3 */ X extends React.Component {

            });"
        `)
    })

    test("class comp with inject and observer", () => {
        expect(
            convert(`
        import {observer, inject} from 'mobx-react'


        /* 1 */
        @inject("test") @observer /* 2 */ export /* 3 */ class X extends React.Component {

        }

        `)
        ).toMatchInlineSnapshot(`
            "import {observer, inject} from 'mobx-react'


            /* 1 */
            export const X = inject(\\"test\\")(observer(class /* 2 */ /* 3 */ X extends React.Component {

            }));"
        `)
    })

    test("class comp with local fields - 1", () => {
        expect(
            convert(
                `
        import {observer, inject} from 'mobx-react'
        import {observable} from "mobx"
        import {Component} from "react"

        @observer class X extends React.Component {
            @observable field =  1
        }

        `,
                { keepDecorators: false }
            )
        ).toMatchInlineSnapshot(`
            "import {observer, inject} from 'mobx-react'
            import { observable, makeObservable } from \\"mobx\\";
            import {Component} from \\"react\\"

            const X = observer(class X extends React.Component {
                field = 1;

                constructor(props) {
                    super(props);

                    makeObservable(this, {
                        field: observable
                    });
                }
            });"
        `)
    })

    test("class comp with local fields preserves Props generic", () => {
        expect(
            convert(
                `
        import {observer, inject} from 'mobx-react'
        import {observable} from "mobx"
        import {PureComponent} from "react"

        @observer class X extends PureComponent<{x: boolean}> {
            @observable field =  1
        }

        `,
                { keepDecorators: false }
            )
        ).toMatchInlineSnapshot(`
            "import {observer, inject} from 'mobx-react'
            import { observable, makeObservable } from \\"mobx\\";
            import {PureComponent} from \\"react\\"

            const X = observer(class X extends PureComponent<{x: boolean}> {
                field = 1;

                constructor(props: {x: boolean}) {
                    super(props);

                    makeObservable(this, {
                        field: observable
                    });
                }
            });"
        `)
    })

    test("class comp with local fields preserves Props generic", () => {
        expect(
            convert(
                `
        import {observer, inject} from 'mobx-react'
        import {observable} from "mobx"
        import {PureComponent} from "react"

        @observer class X extends PureComponent<{x: boolean}> {
            @observable field =  1
        }

        `,
                { keepDecorators: true }
            )
        ).toMatchInlineSnapshot(`
            "import {observer, inject} from 'mobx-react'
            import { observable, makeObservable } from \\"mobx\\";
            import {PureComponent} from \\"react\\"

            @observer class X extends PureComponent<{x: boolean}> {
                @observable field =  1

                constructor(props: {x: boolean}) {
                    super(props);
                    makeObservable(this);
                }
            }"
        `)
    })

    test("makeObservable gets added to the non-type import #2415", () => {
        expect(
            convert(
                `
        import type { IReactionDisposer } from 'mobx';
        import { reaction, observable } from 'mobx';

        export default class Store {
            @observable counter = 0;

            removeReaction: IReactionDisposer;

            constructor() {
                this.removeReaction = reaction(() => this.counter, () => {
                    console.log('it changed');
                });
            }

            cleanup() {
                this.removeReaction();
            }
        }
        `
            )
        ).toMatchInlineSnapshot(`
            "import type { IReactionDisposer } from 'mobx';
            import { reaction, observable, makeObservable } from 'mobx';

            export default class Store {
                counter = 0;

                removeReaction: IReactionDisposer;

                constructor() {
                    makeObservable(this, {
                        counter: observable
                    });

                    this.removeReaction = reaction(() => this.counter, () => {
                        console.log('it changed');
                    });
                }

                cleanup() {
                    this.removeReaction();
                }
            }"
        `)
    })
})

test("weird syntaxes", () => {
    expect(
        convert(`
        import { observable } from 'mobx';

        type NamedTuple = [first: string, other: number, ...rest: Boolean[]]

        class X {
            @observable x = 3;
        }

        class Y {
            async fn() { await tes() }

            *generatorFn() {
                yield 3
            }

            doesJSX() {
                return <hi {...there}>Stuff {/*with comments */}</hi>
            }
        }
        `)
    ).toMatchInlineSnapshot(`
        "import { observable, makeObservable } from 'mobx';

        type NamedTuple = [first: string, other: number, ...rest: Boolean[]]

        class X {
            x = 3;

            constructor() {
                makeObservable(this, {
                    x: observable
                });
            }
        }

        class Y {
            async fn() { await tes() }

            *generatorFn() {
                yield 3
            }

            doesJSX() {
                return <hi {...there}>Stuff {/*with comments */}</hi>
            }
        }"
    `)
})

test("class comp with observer and decorator from another package", () => {
    expect(
        convert(`
    import {observer} from 'mobx-react'
    import {withRouter} from 'react-router-dom'
    /* 1 */
    @withRouter @observer /* 2 */ export /* 3 */ class X extends React.Component {}
    `)
    ).toMatchInlineSnapshot(`
        "import {observer} from 'mobx-react'
        import {withRouter} from 'react-router-dom'
        /* 1 */
        export const X = withRouter(observer(class /* 2 */ /* 3 */ X extends React.Component {}));"
    `)
})

test("class comp with observer, inject and decorator from another package", () => {
    expect(
        convert(`
    import {observer, inject} from 'mobx-react'
    import {withRouter} from 'react-router-dom'
    /* 1 */
    @withRouter @inject("test") @observer /* 2 */ export /* 3 */ class X extends React.Component {}
    `)
    ).toMatchInlineSnapshot(`
        "import {observer, inject} from 'mobx-react'
        import {withRouter} from 'react-router-dom'
        /* 1 */
        export const X = withRouter(
          inject(\\"test\\")(observer(class /* 2 */ /* 3 */ X extends React.Component {}))
        );"
    `)
})

test("makeObservable not added to imports #2540", () => {
    expect(
        convert(`
        import { decorate, observable, action } from 'mobx';
        class TestStore
        {
            testValue = 1;
            testFunc = () =>
            {
                this.testValue++;
            }
        }
        decorate(TestStore, {
            testValue: observable,
            testFunc: action
        });
        `)
    ).toMatchInlineSnapshot(`
        "import { observable, action, makeObservable } from 'mobx';
        class TestStore
        {
            testValue = 1;
            testFunc = () =>
            {
                this.testValue++;
            }

            constructor() {
                makeObservable(this, {
                    testValue: observable,
                    testFunc: action
                });
            }
        }"
    `)
})

test("class default export comp with observer and inject", () => {
    expect(
        convert(`
        import {observer, inject} from 'mobx-react'
        
        @inject("test") @observer export default class X extends React.Component {}
    `)
    ).toMatchInlineSnapshot(`
        "import {observer, inject} from 'mobx-react'
        
        class X extends React.Component {}
        export default inject(\\"test\\")(observer(X));"
    `)
})

test("class default export comp with observer and inject", () => {
    expect(
        convert(`
        import {observer, inject} from 'mobx-react'
        import {withRouter} from 'react-router-dom'

        @inject("test") @observer class X extends React.Component {}

        export default withRouter(X)

    `)
    ).toMatchInlineSnapshot(`
        "import {observer, inject} from 'mobx-react'
        import {withRouter} from 'react-router-dom'

        class X extends React.Component {}
        
        export default withRouter(inject(\\"test\\")(observer(X)))"
    `)
})
