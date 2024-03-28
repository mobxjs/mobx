import { _action } from "../../../src/internal"
import * as mobx from "../../../src/mobx"


// polyfill Symbbol.dispose for tests
if (typeof Symbol.dispose !== "symbol") {
    Object.defineProperty(Symbol, "dispose", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: Symbol.for("dispose")
    })
}
if (typeof Symbol.asyncDispose !== "symbol"){
    Object.defineProperty(Symbol, "asyncDispose", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: Symbol.for("asyncDispose")
    })
}

test("runInAction", () => {
    mobx.configure({ enforceActions: "observed" })
    const values = [] as any[]
    const events = [] as any[]
    const spyDisposer = mobx.spy(ev => {
        if (ev.type === "action")
            events.push({
                name: ev.name,
                arguments: ev.arguments
            })
    })

    const observable = mobx.observable.box(0)
    const d = mobx.autorun(() => values.push(observable.get()))

    {
        using _ = _action();
        observable.set(observable.get() + 6 * 2)
        observable.set(observable.get() - 3) // oops
    }
    expect(values).toEqual([0, 9])

    {
        using _ = _action();
        observable.set(observable.get() + 5 * 2)
        observable.set(observable.get() - 4) // oops
    }

    expect(values).toEqual([0, 9, 15])
    expect(events).toEqual([
        { arguments: [], name: "<unnamed action>" },
        { arguments: [], name: "<unnamed action>" }
    ])

    mobx.configure({ enforceActions: "never" })
    spyDisposer()

    d()
})
