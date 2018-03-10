"use strict"
var mobx = require("../../src/mobx.ts")
var negate = require("../../src/utils/utils.ts").negate

test("negate", function() {
    const isEven = n => n % 2 === 0
    const isOdd = negate(isEven)

    expect(isEven(1)).toEqual(false)
    expect(isOdd(1)).toEqual(true)
})
