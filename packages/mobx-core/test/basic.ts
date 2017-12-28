import {cell, autorun, MobxState} from "../index"

test("autorun should work", () => {
    const context = new MobxState();
    const a = cell(context, 3);
    let v;

    expect(a.get()).toBe(3);
    const d = autorun(context, () => { v = a.get() });

    a.set(5)
    expect(v).toBe(5);
    d();
})
