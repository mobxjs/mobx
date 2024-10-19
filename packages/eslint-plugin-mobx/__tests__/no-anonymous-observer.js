import { getRuleTester } from "./utils/get-rule-tester";

import rule from "../src/no-anonymous-observer.js"

const tester = getRuleTester();

const valids = ["observer(function Name() {})", "observer(class Name {})"]

const invalidsNotFixed = ["observer(() => {})", "observer(function () {})", "observer(class {})"]

const invalidsFixed = [
    ["const Cmp = observer(() => {})", "const Cmp = observer(function Cmp()  {})"],
    ['const Cmp = observer(() => "")', 'const Cmp = observer(function Cmp()  { return "" })'],
    [
        "const Cmp = observer(() => expr())",
        "const Cmp = observer(function Cmp()  { return expr() })"
    ],
    [
        "const Cmp = observer(() => literal)",
        "const Cmp = observer(function Cmp()  { return literal })"
    ],
    ["const Cmp = observer(function () {})", "const Cmp = observer(function Cmp () {})"],
    ["const Cmp = observer(class {})", "const Cmp = observer(class Cmp {})"]
]

tester.run("no-anonymous-observer", rule, {
    valid: valids.map(code => ({ code })),
    invalid: [
        ...invalidsNotFixed.map(code => ({
            code,
            errors: [{ messageId: "observerComponentMustHaveName" }]
        })),
        ...invalidsFixed.map(([code, output]) => ({
            code,
            output,
            errors: [{ messageId: "observerComponentMustHaveName" }]
        }))
    ]
})
