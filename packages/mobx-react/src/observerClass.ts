import { PureComponent, Component } from "react"
import {
    createAtom,
    _allowStateChanges,
    Reaction,
    $mobx,
    _allowStateReadsStart,
    _allowStateReadsEnd
} from "mobx"
import { isUsingStaticRendering } from "mobx-react-lite"

import { newSymbol, shallowEqual, setHiddenProp, patch } from "./utils/utils"

const mobxAdminProperty = $mobx || "$mobx"
const mobxObserverProperty = newSymbol("isMobXReactObserver")
const mobxIsUnmounted = newSymbol("isUnmounted")
const skipRenderKey = newSymbol("skipRender")
const isForcingUpdateKey = newSymbol("isForcingUpdate")

export function makeClassComponentObserver(
    componentClass: React.ComponentClass<any, any>
): React.ComponentClass<any, any> {
    const target = componentClass.prototype

    if (componentClass[mobxObserverProperty]) {
        const displayName = getDisplayName(target)
        console.warn(
            `The provided component class (${displayName}) 
                has already been declared as an observer component.`
        )
    } else {
        componentClass[mobxObserverProperty] = true
    }

    if (target.componentWillReact)
        throw new Error("The componentWillReact life-cycle event is no longer supported")
    if (componentClass["__proto__"] !== PureComponent) {
        if (!target.shouldComponentUpdate) target.shouldComponentUpdate = observerSCU
        else if (target.shouldComponentUpdate !== observerSCU)
            // n.b. unequal check, instead of existence check, as @observer might be on superclass as well
            throw new Error(
                "It is not allowed to use shouldComponentUpdate in observer based components."
            )
    }

    // this.props and this.state are made observable, just to make sure @computed fields that
    // are defined inside the component, and which rely on state or props, re-compute if state or props change
    // (otherwise the computed wouldn't update and become stale on props change, since props are not observable)
    // However, this solution is not without it's own problems: https://github.com/mobxjs/mobx-react/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3Aobservable-props-or-not+
    makeObservableProp(target, "props")
    makeObservableProp(target, "state")

    const baseRender = target.render
    target.render = function () {
        return makeComponentReactive.call(this, baseRender)
    }
    patch(target, "componentWillUnmount", function () {
        if (isUsingStaticRendering() === true) return
        this.render[mobxAdminProperty]?.dispose()
        this[mobxIsUnmounted] = true

        if (!this.render[mobxAdminProperty]) {
            // Render may have been hot-swapped and/or overriden by a subclass.
            const displayName = getDisplayName(this)
            console.warn(
                `The reactive render of an observer class component (${displayName}) 
                was overriden after MobX attached. This may result in a memory leak if the 
                overriden reactive render was not properly disposed.`
            )
        }
    })
    return componentClass
}

// Generates a friendly name for debugging
function getDisplayName(comp: any) {
    return (
        comp.displayName ||
        comp.name ||
        (comp.constructor && (comp.constructor.displayName || comp.constructor.name)) ||
        "<component>"
    )
}

function makeComponentReactive(render: any) {
    if (isUsingStaticRendering() === true) return render.call(this)

    /**
     * If props are shallowly modified, react will render anyway,
     * so atom.reportChanged() should not result in yet another re-render
     */
    setHiddenProp(this, skipRenderKey, false)
    /**
     * forceUpdate will re-assign this.props. We don't want that to cause a loop,
     * so detect these changes
     */
    setHiddenProp(this, isForcingUpdateKey, false)

    const initialName = getDisplayName(this)
    const baseRender = render.bind(this)

    let isRenderingPending = false

    const reaction = new Reaction(`${initialName}.render()`, () => {
        if (!isRenderingPending) {
            // N.B. Getting here *before mounting* means that a component constructor has side effects (see the relevant test in misc.js)
            // This unidiomatic React usage but React will correctly warn about this so we continue as usual
            // See #85 / Pull #44
            isRenderingPending = true
            if (this[mobxIsUnmounted] !== true) {
                let hasError = true
                try {
                    setHiddenProp(this, isForcingUpdateKey, true)
                    if (!this[skipRenderKey]) Component.prototype.forceUpdate.call(this)
                    hasError = false
                } finally {
                    setHiddenProp(this, isForcingUpdateKey, false)
                    if (hasError) reaction.dispose()
                }
            }
        }
    })

    reaction["reactComponent"] = this
    reactiveRender[mobxAdminProperty] = reaction
    this.render = reactiveRender

    function reactiveRender() {
        isRenderingPending = false
        let exception = undefined
        let rendering = undefined
        reaction.track(() => {
            try {
                rendering = _allowStateChanges(false, baseRender)
            } catch (e) {
                exception = e
            }
        })
        if (exception) {
            throw exception
        }
        return rendering
    }

    return reactiveRender.call(this)
}

function observerSCU(nextProps: React.Props<any>, nextState: any): boolean {
    if (isUsingStaticRendering()) {
        console.warn(
            "[mobx-react] It seems that a re-rendering of a React component is triggered while in static (server-side) mode. Please make sure components are rendered only once server-side."
        )
    }
    // update on any state changes (as is the default)
    if (this.state !== nextState) {
        return true
    }
    // update if props are shallowly not equal, inspired by PureRenderMixin
    // we could return just 'false' here, and avoid the `skipRender` checks etc
    // however, it is nicer if lifecycle events are triggered like usually,
    // so we return true here if props are shallowly modified.
    return !shallowEqual(this.props, nextProps)
}

function makeObservableProp(target: any, propName: string): void {
    const valueHolderKey = newSymbol(`reactProp_${propName}_valueHolder`)
    const atomHolderKey = newSymbol(`reactProp_${propName}_atomHolder`)
    function getAtom() {
        if (!this[atomHolderKey]) {
            setHiddenProp(this, atomHolderKey, createAtom("reactive " + propName))
        }
        return this[atomHolderKey]
    }
    Object.defineProperty(target, propName, {
        configurable: true,
        enumerable: true,
        get: function () {
            let prevReadState = false

            if (_allowStateReadsStart && _allowStateReadsEnd) {
                prevReadState = _allowStateReadsStart(true)
            }
            getAtom.call(this).reportObserved()

            if (_allowStateReadsStart && _allowStateReadsEnd) {
                _allowStateReadsEnd(prevReadState)
            }

            return this[valueHolderKey]
        },
        set: function set(v) {
            if (!this[isForcingUpdateKey] && !shallowEqual(this[valueHolderKey], v)) {
                setHiddenProp(this, valueHolderKey, v)
                setHiddenProp(this, skipRenderKey, true)
                getAtom.call(this).reportChanged()
                setHiddenProp(this, skipRenderKey, false)
            } else {
                setHiddenProp(this, valueHolderKey, v)
            }
        }
    })
}
