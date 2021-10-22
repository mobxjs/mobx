import { execSync } from "child_process"
import { join, dirname } from "path"
import { readFileSync, writeFileSync, mkdirSync } from "fs"
const dedent = require("dedent-js")

test("run cli #2506 #3142", () => {
    // #3142 - the white space must be in cwd
    const cwd = join(__dirname, "fixtures", "some path");    
    const testFile = join(cwd, "some file.tsx")
    const baseContent = dedent(`import { observable } from "mobx";
    class Test {
        @observable x = 1;
    }
    `)    
    mkdirSync(dirname(testFile), { recursive: true })
    writeFileSync(testFile, baseContent)
    execSync("node ../../../cli.js", { cwd })
    expect(readFileSync(testFile, "utf8")).toMatchInlineSnapshot(`
        "import { observable, makeObservable } from \\"mobx\\";
        class Test {
            x = 1;

            constructor() {
                makeObservable(this, {
                    x: observable
                });
            }
        }"
    `)
})

test("run cli with --parseTsAsNonJsx #2754", () => {
    const testNonJsxFile = join(__dirname, "fixtures", "some nonjsx", "some nonjsx.ts")
    const testJsxFile = join(__dirname, "fixtures", "some nonjsx", "some jsx.tsx")
    const nonJsxContent = dedent(`
        import { useSearch } from "./useSearch"
        import { observable } from "mobx"

        class Test {
            @observable x = 1
        }
        
        export function useAlias(): string {
            const parsedSearch = useSearch()
            return (<string>parsedSearch.alias || "").toUpperCase()
        }
    `)
    const jsxContent = dedent(`
        import React from 'react'
        import {observer} from 'mobx-react'
        
        @observer
        class X extends React.Component {
            render() {
                return <div>hi</div>
            }
        }
    `)

    mkdirSync(dirname(testNonJsxFile), { recursive: true })
    writeFileSync(testNonJsxFile, nonJsxContent)
    writeFileSync(testJsxFile, jsxContent)
    execSync("node ../../cli.js --parseTsAsNonJsx", {
        cwd: join(__dirname, "fixtures")
    })
    expect(readFileSync(testNonJsxFile, "utf8")).toMatchInlineSnapshot(`
        "import { useSearch } from \\"./useSearch\\"
        import { observable, makeObservable } from \\"mobx\\";

        class Test {
            x = 1;

            constructor() {
                makeObservable(this, {
                    x: observable
                });
            }
        }

        export function useAlias(): string {
            const parsedSearch = useSearch()
            return (<string>parsedSearch.alias || \\"\\").toUpperCase()
        }"
    `)
    expect(readFileSync(testJsxFile, "utf8")).toMatchInlineSnapshot(`
        "import React from 'react'
        import {observer} from 'mobx-react'

        const X = observer(class X extends React.Component {
            render() {
                return <div>hi</div>
            }
        });"
    `)
})
