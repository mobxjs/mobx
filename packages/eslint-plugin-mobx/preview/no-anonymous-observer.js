/* eslint mobx/no-anonymous-observer: "error" */

observer(() => {})
observer(function () {})
observer(class {})

const Cmp = observer(() => {})
const Cmp = observer(() => "") // different autofix
const Cmp = observer(() => expr()) // different autofix
const Cmp = observer(() => literal) // different autofix
const Cmp = observer(function () {})
const Cmp = observer(class {})

observer(function Name() {})
observer(class Name {})
