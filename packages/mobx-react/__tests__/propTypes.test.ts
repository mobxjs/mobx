import PropTypes from "prop-types"
import { PropTypes as MRPropTypes } from "../src"
import { observable } from "mobx"

// Cause `checkPropTypes` caches errors and doesn't print them twice....
// https://github.com/facebook/prop-types/issues/91
let testComponentId = 0

function typeCheckFail(declaration, value, message) {
    const baseError = console.error
    let error = ""
    console.error = msg => {
        error = msg
    }

    const props = { testProp: value }
    const propTypes = { testProp: declaration }

    const compId = "testComponent" + ++testComponentId
    PropTypes.checkPropTypes(propTypes, props, "prop", compId)

    error = error.replace(compId, "testComponent")
    expect(error).toBe("Warning: Failed prop type: " + message)
    console.error = baseError
}

function typeCheckFailRequiredValues(declaration) {
    const baseError = console.error
    let error = ""
    console.error = msg => {
        error = msg
    }

    const propTypes = { testProp: declaration }
    const specifiedButIsNullMsg = /but its value is `null`\./
    const unspecifiedMsg = /but its value is `undefined`\./

    const props1 = { testProp: null }
    PropTypes.checkPropTypes(propTypes, props1, "testProp", "testComponent" + ++testComponentId)
    expect(specifiedButIsNullMsg.test(error)).toBeTruthy()

    error = ""
    const props2 = { testProp: undefined }
    PropTypes.checkPropTypes(propTypes, props2, "testProp", "testComponent" + ++testComponentId)
    expect(unspecifiedMsg.test(error)).toBeTruthy()

    error = ""
    const props3 = {}
    PropTypes.checkPropTypes(propTypes, props3, "testProp", "testComponent" + ++testComponentId)
    expect(unspecifiedMsg.test(error)).toBeTruthy()

    console.error = baseError
}

function typeCheckPass(declaration: any, value?: any) {
    const props = { testProp: value }
    const error = PropTypes.checkPropTypes(
        { testProp: declaration },
        props,
        "testProp",
        "testComponent" + ++testComponentId
    )
    expect(error).toBeUndefined()
}

test("Valid values", () => {
    typeCheckPass(MRPropTypes.observableArray, observable([]))
    typeCheckPass(MRPropTypes.observableArrayOf(PropTypes.string), observable([""]))
    typeCheckPass(MRPropTypes.arrayOrObservableArray, observable([]))
    typeCheckPass(MRPropTypes.arrayOrObservableArray, [])
    typeCheckPass(MRPropTypes.arrayOrObservableArrayOf(PropTypes.string), observable([""]))
    typeCheckPass(MRPropTypes.arrayOrObservableArrayOf(PropTypes.string), [""])
    typeCheckPass(MRPropTypes.observableObject, observable({}))
    typeCheckPass(MRPropTypes.objectOrObservableObject, {})
    typeCheckPass(MRPropTypes.objectOrObservableObject, observable({}))
    typeCheckPass(MRPropTypes.observableMap, observable(observable.map({}, { deep: false })))
})

test("should be implicitly optional and not warn", () => {
    typeCheckPass(MRPropTypes.observableArray)
    typeCheckPass(MRPropTypes.observableArrayOf(PropTypes.string))
    typeCheckPass(MRPropTypes.arrayOrObservableArray)
    typeCheckPass(MRPropTypes.arrayOrObservableArrayOf(PropTypes.string))
    typeCheckPass(MRPropTypes.observableObject)
    typeCheckPass(MRPropTypes.objectOrObservableObject)
    typeCheckPass(MRPropTypes.observableMap)
})

test("should warn for missing required values, function (test)", () => {
    typeCheckFailRequiredValues(MRPropTypes.observableArray.isRequired)
    typeCheckFailRequiredValues(MRPropTypes.observableArrayOf(PropTypes.string).isRequired)
    typeCheckFailRequiredValues(MRPropTypes.arrayOrObservableArray.isRequired)
    typeCheckFailRequiredValues(MRPropTypes.arrayOrObservableArrayOf(PropTypes.string).isRequired)
    typeCheckFailRequiredValues(MRPropTypes.observableObject.isRequired)
    typeCheckFailRequiredValues(MRPropTypes.objectOrObservableObject.isRequired)
    typeCheckFailRequiredValues(MRPropTypes.observableMap.isRequired)
})

test("should fail date and regexp correctly", () => {
    typeCheckFail(
        MRPropTypes.observableObject,
        new Date(),
        "Invalid prop `testProp` of type `date` supplied to " +
            "`testComponent`, expected `mobx.ObservableObject`."
    )
    typeCheckFail(
        MRPropTypes.observableArray,
        /please/,
        "Invalid prop `testProp` of type `regexp` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray`."
    )
})

test("observableArray", () => {
    typeCheckFail(
        MRPropTypes.observableArray,
        [],
        "Invalid prop `testProp` of type `array` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray`."
    )
    typeCheckFail(
        MRPropTypes.observableArray,
        "",
        "Invalid prop `testProp` of type `string` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray`."
    )
})

test("arrayOrObservableArray", () => {
    typeCheckFail(
        MRPropTypes.arrayOrObservableArray,
        "",
        "Invalid prop `testProp` of type `string` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray` or javascript `array`."
    )
})

test("observableObject", () => {
    typeCheckFail(
        MRPropTypes.observableObject,
        {},
        "Invalid prop `testProp` of type `object` supplied to " +
            "`testComponent`, expected `mobx.ObservableObject`."
    )
    typeCheckFail(
        MRPropTypes.observableObject,
        "",
        "Invalid prop `testProp` of type `string` supplied to " +
            "`testComponent`, expected `mobx.ObservableObject`."
    )
})

test("objectOrObservableObject", () => {
    typeCheckFail(
        MRPropTypes.objectOrObservableObject,
        "",
        "Invalid prop `testProp` of type `string` supplied to " +
            "`testComponent`, expected `mobx.ObservableObject` or javascript `object`."
    )
})

test("observableMap", () => {
    typeCheckFail(
        MRPropTypes.observableMap,
        {},
        "Invalid prop `testProp` of type `object` supplied to " +
            "`testComponent`, expected `mobx.ObservableMap`."
    )
})

test("observableArrayOf", () => {
    typeCheckFail(
        MRPropTypes.observableArrayOf(PropTypes.string),
        2,
        "Invalid prop `testProp` of type `number` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray`."
    )
    typeCheckFail(
        MRPropTypes.observableArrayOf(PropTypes.string),
        observable([2]),
        "Invalid prop `testProp[0]` of type `number` supplied to " +
            "`testComponent`, expected `string`."
    )
    typeCheckFail(
        MRPropTypes.observableArrayOf({ foo: (MRPropTypes as any).string } as any),
        { foo: "bar" },
        "Property `testProp` of component `testComponent` has invalid PropType notation."
    )
})

test("arrayOrObservableArrayOf", () => {
    typeCheckFail(
        MRPropTypes.arrayOrObservableArrayOf(PropTypes.string),
        2,
        "Invalid prop `testProp` of type `number` supplied to " +
            "`testComponent`, expected `mobx.ObservableArray` or javascript `array`."
    )
    typeCheckFail(
        MRPropTypes.arrayOrObservableArrayOf(PropTypes.string),
        observable([2]),
        "Invalid prop `testProp[0]` of type `number` supplied to " +
            "`testComponent`, expected `string`."
    )
    typeCheckFail(
        MRPropTypes.arrayOrObservableArrayOf(PropTypes.string),
        [2],
        "Invalid prop `testProp[0]` of type `number` supplied to " +
            "`testComponent`, expected `string`."
    )
    // TODO:
    typeCheckFail(
        MRPropTypes.arrayOrObservableArrayOf({ foo: (MRPropTypes as any).string } as any),
        { foo: "bar" },
        "Property `testProp` of component `testComponent` has invalid PropType notation."
    )
})
