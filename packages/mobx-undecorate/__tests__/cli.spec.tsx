import { execSync } from "child_process"
import { join } from "path"
import { readFileSync, writeFileSync } from "fs"
const dedent = require("dedent-js")

test("run cli #2506", () => {
    const testFile = join(__dirname, "fixtures", "some path", "some file.tsx")
    const baseContent = dedent(`import { observable } from "mobx";
    class Test {
        @observable x = 1;
    }
    `)

    writeFileSync(testFile, baseContent)
    execSync("node ../../cli.js", {
        cwd: join(__dirname, "fixtures")
    })
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
