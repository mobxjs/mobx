import { getRuleTester } from "./utils/get-rule-tester";

import rule from "../src/missing-observer.js"

const tester = getRuleTester();

const valids = [
    "observer(function Named() { });",
    "const foo = observer(function Named() { })",
    "const Anonym = observer(function () { });",
    "const Arrow = observer(() => { });",
    "function notCmp() { }",
    "const notCmp = function notCmp() { }",
    "const notCmp = function () { }",
    "const notCmp = () => { }",
    "class NotCmp { }",
    "class NotCmp extends Foo { }",
    "class NotCmp extends React.Foo { }",
    "const Cmp = observer(class Cmp extends React.Component { })",
    "const Cmp = observer(class Cmp extends Component { })",
    "const Cmp = observer(class extends React.Component { })",
    "const Cmp = observer(class extends Component { })"
]

const invalids = [
    ["function Named() { }", "const Named = observer(function Named() { })"],
    ["const foo = function Named() { }", "const foo = observer(function Named() { })"],
    ["const Anonym = function () { };", "const Anonym = observer(function () { });"],
    ["const Arrow = () => { };", "const Arrow = observer(() => { });"],
    [
        "class Cmp extends React.Component { }",
        "const Cmp = observer(class Cmp extends React.Component { })"
    ],
    ["class Cmp extends Component { }", "const Cmp = observer(class Cmp extends Component { })"],
    [
        "const Cmp = class extends React.Component { }",
        "const Cmp = observer(class extends React.Component { })"
    ],
    [
        "const Cmp = class extends Component { }",
        "const Cmp = observer(class extends Component { })"
    ],
    ["class extends Component { }", "observer(class extends Component { })"],
    ["class extends React.Component { }", "observer(class extends React.Component { })"]
]

tester.run("missing-observer", rule, {
    valid: valids.map(code => ({ code })),
    invalid: invalids.map(([code, output]) => ({
        code,
        output,
        errors: [{ messageId: "missingObserver" }]
    }))
})
