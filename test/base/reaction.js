var mobx = require("../../src/mobx.ts")
var reaction = mobx.reaction
const utils = require("../utils/test-utils")

test("basic", () => {
    var a = mobx.observable.box(1)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue)
        }
    )

    a.set(2)
    a.set(3)
    d()
    a.set(4)

    expect(values).toEqual([2, 3])
})

test("effect fireImmediately is honored", () => {
    var a = mobx.observable.box(1)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue)
        },
        { fireImmediately: true }
    )

    a.set(2)
    a.set(3)
    d()
    a.set(4)

    expect(values).toEqual([1, 2, 3])
})

test("effect is untracked", () => {
    var a = mobx.observable.box(1)
    var b = mobx.observable.box(2)
    var values = []

    var d = reaction(
        () => a.get(),
        newValue => {
            values.push(newValue * b.get())
        },
        true
    )

    a.set(2)
    b.set(7) // shoudn't trigger a new change
    a.set(3)
    d()
    a.set(4)

    expect(values).toEqual([2, 4, 21])
})

const TIME_AMPLIFIER = 1
if (process.env.CI === "true") {
    console.log("Amplifying time")
    TIME_AMPLIFIER = 10
}

test("effect debounce is honored", () => {
    expect.assertions(2)

    return new Promise((resolve, reject) => {
        var a = mobx.observable.box(1)
        var values = []
        var exprCount = 0

        var d = reaction(
            () => {
                exprCount++
                return a.get()
            },
            newValue => {
                values.push(newValue)
            },
            {
                delay: 150 * TIME_AMPLIFIER,
                fireImmediately: false
            }
        )

        setTimeout(() => a.set(2), 40 * TIME_AMPLIFIER)
        setTimeout(() => {
            a.set(3) // should not be visible, combined with the next
            setImmediate(() => {
                a.set(4)
            })
        }, 300 * TIME_AMPLIFIER)
        setTimeout(() => a.set(5), 600 * TIME_AMPLIFIER)
        setTimeout(() => {
            d()
            a.set(6)
        }, 1000 * TIME_AMPLIFIER)

        setTimeout(() => {
            try {
                expect(values).toEqual([2, 4, 5])
                expect(exprCount).toBe(4)
                resolve()
            } catch (e) {
                reject(e)
            }
        }, 1200 * TIME_AMPLIFIER)
    })
})

test("effect debounce + fire immediately is honored", () => {
    expect.assertions(2)
    return new Promise((resolve, reject) => {
        var a = mobx.observable.box(1)
        var values = []
        var exprCount = 0

        var d = reaction(
            () => {
                exprCount++
                return a.get()
            },
            newValue => {
                values.push(newValue)
            },
            {
                fireImmediately: true,
                delay: 100 * TIME_AMPLIFIER
            }
        )

        setTimeout(() => a.set(3), 150 * TIME_AMPLIFIER)
        setTimeout(() => a.set(4), 300 * TIME_AMPLIFIER)

        setTimeout(() => {
            try {
                d()
                expect(values).toEqual([1, 3, 4])
                expect(exprCount).toBe(3)
                resolve()
            } catch (e) {
                reject(e)
            }
        }, 500 * TIME_AMPLIFIER)
    })
})

test("passes Reaction as an argument to expression function", () => {
    var a = mobx.observable.box(1)
    var values = []

    reaction(
        r => {
            if (a.get() === "pleaseDispose") r.dispose()
            return a.get()
        },
        newValue => {
            values.push(newValue)
        },
        true
    )

    a.set(2)
    a.set(2)
    a.set("pleaseDispose")
    a.set(3)
    a.set(4)

    expect(values).toEqual([1, 2, "pleaseDispose"])
})

test("passes Reaction as an argument to effect function", () => {
    var a = mobx.observable.box(1)
    var values = []

    reaction(
        () => a.get(),
        (newValue, r) => {
            if (a.get() === "pleaseDispose") r.dispose()
            values.push(newValue)
        },
        true
    )

    a.set(2)
    a.set(2)
    a.set("pleaseDispose")
    a.set(3)
    a.set(4)

    expect(values).toEqual([1, 2, "pleaseDispose"])
})

test("can dispose reaction on first run", () => {
    var a = mobx.observable.box(1)

    var valuesExpr1st = []
    reaction(
        () => a.get(),
        (newValue, r) => {
            r.dispose()
            valuesExpr1st.push(newValue)
        },
        true
    )

    var valuesEffect1st = []
    reaction(
        r => {
            r.dispose()
            return a.get()
        },
        newValue => {
            valuesEffect1st.push(newValue)
        },
        true
    )

    var valuesExpr = []
    reaction(
        () => a.get(),
        (newValue, r) => {
            r.dispose()
            valuesExpr.push(newValue)
        }
    )

    var valuesEffect = []
    reaction(
        r => {
            r.dispose()
            return a.get()
        },
        newValue => {
            valuesEffect.push(newValue)
        }
    )

    a.set(2)
    a.set(3)

    expect(valuesExpr1st).toEqual([1])
    expect(valuesEffect1st).toEqual([1])
    expect(valuesExpr).toEqual([2])
    expect(valuesEffect).toEqual([])
})

test("#278 do not rerun if expr output doesn't change", () => {
    var a = mobx.observable.box(1)
    var values = []

    var d = reaction(
        () => (a.get() < 10 ? a.get() : 11),
        newValue => {
            values.push(newValue)
        }
    )

    a.set(2)
    a.set(3)
    a.set(10)
    a.set(11)
    a.set(12)
    a.set(4)
    a.set(5)
    a.set(13)

    d()
    a.set(4)

    expect(values).toEqual([2, 3, 11, 4, 5, 11])
})

test("#278 do not rerun if expr output doesn't change structurally", () => {
    var users = mobx.observable([
        {
            name: "jan",
            get uppername() {
                return this.name.toUpperCase()
            }
        },
        {
            name: "piet",
            get uppername() {
                return this.name.toUpperCase()
            }
        }
    ])
    var values = []

    var d = reaction(
        () => users.map(user => user.uppername),
        newValue => {
            values.push(newValue)
        },
        {
            fireImmediately: true,
            compareStructural: true
        }
    )

    users[0].name = "john"
    users[0].name = "JoHn"
    users[0].name = "jOHN"
    users[1].name = "johan"

    d()
    users[1].name = "w00t"

    expect(values).toEqual([["JAN", "PIET"], ["JOHN", "PIET"], ["JOHN", "JOHAN"]])
})

test("do not rerun if prev & next expr output is NaN", () => {
    var v = mobx.observable.box("a")
    var values = []
    var valuesS = []

    var d = reaction(
        () => v.get(),
        newValue => {
            values.push(String(newValue))
        },
        { fireImmediately: true }
    )
    var dd = reaction(
        () => v.get(),
        newValue => {
            valuesS.push(String(newValue))
        },
        { fireImmediately: true, compareStructural: true }
    )

    v.set(NaN)
    v.set(NaN)
    v.set(NaN)
    v.set("b")

    d()
    dd()

    expect(values).toEqual(["a", "NaN", "b"])
    expect(valuesS).toEqual(["a", "NaN", "b"])
})

test("reaction uses equals", () => {
    const o = mobx.observable.box("a")
    const values = []
    const disposeReaction = mobx.reaction(
        () => o.get(),
        value => values.push(value.toLowerCase()),
        { equals: (from, to) => from.toUpperCase() === to.toUpperCase(), fireImmediately: true }
    )
    expect(values).toEqual(["a"])
    o.set("A")
    expect(values).toEqual(["a"])
    o.set("B")
    expect(values).toEqual(["a", "b"])
    o.set("A")
    expect(values).toEqual(["a", "b", "a"])

    disposeReaction()
})

test("reaction equals function only invoked when necessary", () => {
    utils.supressConsole(() => {
        const comparisons = []
        const loggingComparer = (from, to) => {
            comparisons.push({ from, to })
            return from === to
        }

        const left = mobx.observable.box("A")
        const right = mobx.observable.box("B")

        const values = []
        const disposeReaction = mobx.reaction(
            // Note: exceptions thrown here are intentional!
            () => left.get().toLowerCase() + right.get().toLowerCase(),
            value => values.push(value),
            { equals: loggingComparer, fireImmediately: true }
        )

        // No comparison should be made on the first value
        expect(comparisons).toEqual([])

        // First change will cause a comparison
        left.set("C")
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Exception in the reaction expression won't cause a comparison
        left.set(null)
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Another exception in the reaction expression won't cause a comparison
        right.set(null)
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }])

        // Transition from exception in the expression will cause a comparison with the last valid value
        left.set("D")
        right.set("E")
        expect(comparisons).toEqual([{ from: "ab", to: "cb" }, { from: "cb", to: "de" }])

        // Another value change will cause a comparison
        right.set("F")
        expect(comparisons).toEqual([
            { from: "ab", to: "cb" },
            { from: "cb", to: "de" },
            { from: "de", to: "df" }
        ])

        expect(values).toEqual(["ab", "cb", "de", "df"])

        disposeReaction()
    })
})

test("issue #1148", () => {
    const a = mobx.observable.box(1)
    let called = 0
    const dispose = reaction(
        () => this.a,
        () => {
            called++
        },
        { delay: 1 }
    )
    a.set(2)
    dispose()
    expect(called).toBe(0)
})

test("Introduce custom onError for - autorun - 1", () => {
    let error = ""
    let globalHandlerCalled = false
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    expect(() => {
        mobx.autorun(
            () => {
                throw "OOPS"
            },
            {
                onError(e) {
                    error = e
                }
            }
        )
    }).not.toThrow()
    expect(error).toBe("OOPS")
    expect(globalHandlerCalled).toBe(false)
    d()
})

test("Introduce custom onError for - autorun - 2", done => {
    let error = ""
    let globalHandlerCalled = false
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    expect(() => {
        mobx.autorun(
            () => {
                throw "OOPS"
            },
            {
                delay: 5,
                onError(error) {
                    setImmediate(() => {
                        expect(error).toBe("OOPS")
                        expect(globalHandlerCalled).toBe(false)
                        d()
                        done()
                    })
                }
            }
        )
    }).not.toThrow()
})

test("Introduce custom onError for - reaction - 1", () => {
    let error = ""
    let globalHandlerCalled = false
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    expect(() => {
        mobx.reaction(
            () => {
                throw "OOPS"
            },
            () => {},
            {
                onError(e) {
                    error = e
                }
            }
        )
    }).not.toThrow()
    expect(error).toBe("OOPS")
    expect(globalHandlerCalled).toBe(false)
    d()
})

test("Introduce custom onError for - reaction - 2", () => {
    let error = ""
    let globalHandlerCalled = false
    let box = mobx.observable.box(1)
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    mobx.reaction(
        () => box.get(),
        () => {
            throw "OOPS"
        },
        {
            onError(e) {
                error = e
            }
        }
    )
    expect(() => {
        box.set(2)
    }).not.toThrow()
    expect(error).toBe("OOPS")
    expect(globalHandlerCalled).toBe(false)
    d()
})

test("Introduce custom onError for - reaction - 3", done => {
    let globalHandlerCalled = false
    let box = mobx.observable.box(1)
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    mobx.reaction(
        () => box.get(),
        () => {
            throw "OOPS"
        },
        {
            delay: 5,
            onError(e) {
                expect(e).toBe("OOPS")
                setImmediate(() => {
                    expect(globalHandlerCalled).toBe(false)
                    d()
                    done()
                })
            }
        }
    )
    expect(() => {
        box.set(2)
    }).not.toThrow()
})

test("Introduce custom onError for - when - 1", () => {
    let error = ""
    let globalHandlerCalled = false
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    expect(() => {
        mobx.when(
            () => {
                throw "OOPS"
            },
            () => {},
            {
                onError(e) {
                    error = e
                }
            }
        )
    }).not.toThrow()
    expect(error).toBe("OOPS")
    expect(globalHandlerCalled).toBe(false)
    d()
})

test("Introduce custom onError for - when - 2", () => {
    let error = ""
    let globalHandlerCalled = false
    let box = mobx.observable.box(1)
    const d = mobx.onReactionError(() => {
        globalHandlerCalled = true
    })
    mobx.when(
        () => box.get() === 2,
        () => {
            throw "OOPS"
        },
        {
            onError(e) {
                error = e
            }
        }
    )
    expect(() => {
        box.set(2)
    }).not.toThrow()
    expect(error).toBe("OOPS")
    expect(globalHandlerCalled).toBe(false)
    d()
})
