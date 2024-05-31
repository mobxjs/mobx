"use strict"
const mobx = require("../../../src/mobx.ts")
const utils = require("../../v5/utils/test-utils")

test("spy output", () => {
    const events = []

    const stop = mobx.spy(c => events.push(c))

    doStuff()

    stop()

    doStuff()

    events.forEach(ev => {
        delete ev.object
        delete ev.fn
        delete ev.time
    })

    expect(events).toMatchSnapshot()
})

function doStuff() {
    const a = mobx.observable.box(2)
    a.set(3)

    const b = mobx.observable({
        c: 4
    })
    b.c = 5
    mobx.extendObservable(b, { d: 6 })
    b.d = 7

    const e = mobx.observable([1, 2])
    e.push(3, 4)
    e.shift()
    e[2] = 5

    const f = mobx.observable.map({ g: 1 })
    f.delete("h")
    f.delete("g")
    f.set("i", 5)
    f.set("i", 6)

    const j = mobx.computed(() => a.get() * 2)

    mobx.autorun(() => {
        j.get()
    })

    a.set(4)

    mobx.transaction(function myTransaction() {
        a.set(5)
        a.set(6)
    })

    mobx.action("myTestAction", newValue => {
        a.set(newValue)
    }).call({}, 7)
}

test("spy error", () => {
    utils.supressConsole(() => {
        mobx._getGlobalState().mobxGuid = 0

        const a = mobx.observable({
            x: 2,
            get y() {
                if (this.x === 3) throw "Oops"
                return this.x * 2
            },
            setX: mobx.action(function setX(x) {
                this.x = x
            })
        })

        const events = []
        const stop = mobx.spy(c => events.push(c))

        const d = mobx.autorun(() => a.y, { name: "autorun" })

        a.x = 3
        a.setX(4)
        const actionEvents = events.filter(event => event.type === "action")
        const isActionsTypeofObservable = actionEvents.reduce(
            (ret, action) => ret && action.object === a,
            true
        )
        events.forEach(x => {
            delete x.fn
            delete x.object
            delete x.time
        })
        expect(isActionsTypeofObservable).toBe(true)
        expect(events).toMatchSnapshot()

        d()
        stop()
    })
})

test("spy stop listen from handler, #1459", () => {
    const stop = mobx.spy(() => stop())
    mobx.spy(() => { })
    doStuff()
})

test("bound actions report correct object (discussions/3140)", () => {
    class AppState {
        constructor() {
            mobx.makeAutoObservable(this, {
                actionBound: mobx.action.bound,
            }, { autoBind: true });
        }

        actionBound() { }
        autoActionBound() { }
    }

    const appState = new AppState();
    const { actionBound, autoActionBound } = appState;

    let events = [];
    const disposeSpy = mobx.spy((event) => {
        if (event.type !== 'action') return;
        events.push(event);
    });

    try {
        actionBound();
        expect(events.pop().object).toBe(appState)
        autoActionBound();
        expect(events.pop().object).toBe(appState)
    } finally {
        disposeSpy();
    }
})

test("computed shouldn't report update unless the value changed #3109", () => {
    const number = mobx.observable({
        value: 0,
        get isEven() {
            return (this.value % 2) === 0;
        }
    })

    const events = [];
    const disposeSpy = mobx.spy(event => {
        if (event.observableKind === 'computed' && event.type === 'update') {
            events.push(event);
        };
    });

    const disposeAutorun = mobx.autorun(() => number.isEven);

    try {
        expect(events.pop()).toMatchObject({ oldValue: { cause: null }, newValue: true });
        number.value++; // 1        
        expect(events.pop()).toMatchObject({ oldValue: true, newValue: false });
        number.value++; // 2   
        expect(events.pop()).toMatchObject({ oldValue: false, newValue: true });
        number.value += 2; // 4       
        expect(events.pop()).toBe(undefined);
        number.value += 2; // 6
        expect(events.pop()).toBe(undefined);
    } finally {
        disposeSpy();
        disposeAutorun();
    }
})
