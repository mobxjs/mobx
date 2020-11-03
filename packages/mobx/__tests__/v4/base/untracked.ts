import { autorun, observable, computed, untracked } from "../mobx4"

test("untracked 1", () => {
    let cCalcs = 0,
        dCalcs = 0
    const a = observable.box(1)
    const b = observable.box(2)
    const c = computed(() => {
        cCalcs++
        return a.get() + untracked(() => b.get())
    })
    let result

    autorun(() => {
        dCalcs++
        result = c.get()
    })

    expect(result).toBe(3)
    expect(cCalcs).toBe(1)
    expect(dCalcs).toBe(1)

    b.set(3)
    expect(result).toBe(3)
    expect(cCalcs).toBe(1)
    expect(dCalcs).toBe(1)

    a.set(2)
    expect(result).toBe(5)
    expect(cCalcs).toBe(2)
    expect(dCalcs).toBe(2)
})
