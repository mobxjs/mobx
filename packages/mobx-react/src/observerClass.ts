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

const mobxAdminProperty = $mobx || "$mobx" // BC
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

    if (target.componentWillReact) {
        throw new Error("The componentWillReact life-cycle event is no longer supported")
    }
    if (componentClass["__proto__"] !== PureComponent) {
        if (!target.shouldComponentUpdate) {
            target.shouldComponentUpdate = observerSCU
        } else if (target.shouldComponentUpdate !== observerSCU) {
            // n.b. unequal check, instead of existence check, as @observer might be on superclass as well
            throw new Error(
                "It is not allowed to use shouldComponentUpdate in observer based components."
            )
        }
    }

    // this.props and this.state are made observable, just to make sure @computed fields that
    // are defined inside the component, and which rely on state or props, re-compute if state or props change
    // (otherwise the computed wouldn't update and become stale on props change, since props are not observable)
    // However, this solution is not without it's own problems: https://github.com/mobxjs/mobx-react/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3Aobservable-props-or-not+
    makeObservableProp(target, "props")
    makeObservableProp(target, "state")
    if (componentClass.contextType) {
        makeObservableProp(target, "context")
    }

    const originalRender = target.render
    if (typeof originalRender !== "function") {
        const displayName = getDisplayName(target)
        throw new Error(
            `[mobx-react] class component (${displayName}) is missing \`render\` method.` +
                `\n\`observer\` requires \`render\` being a function defined on prototype.` +
                `\n\`render = () => {}\` or \`render = function() {}\` is not supported.`
        )
    }
    target.render = function () {
        this.render = isUsingStaticRendering()
            ? originalRender
            : createReactiveRender.call(this, originalRender)
        return this.render()
    }
    patch(target, "componentDidMount", function () {
        this[mobxIsUnmounted] = false
        if (!this.render[mobxAdminProperty]) {
            // Reaction is re-created automatically during render, but a component can re-mount and skip render #3395.
            // To re-create the reaction and re-subscribe to relevant observables we have to force an update.
            Component.prototype.forceUpdate.call(this)
        }
    })
    patch(target, "componentWillUnmount", function () {
        if (isUsingStaticRendering()) {
            return
        }

        const reaction = this.render[mobxAdminProperty]
        if (reaction) {
            reaction.dispose()
            // Forces reaction to be re-created on next render
            this.render[mobxAdminProperty] = null
        } else {
            // Render may have been hot-swapped and/or overridden by a subclass.
            const displayName = getDisplayName(this)
            console.warn(
                `The reactive render of an observer class component (${displayName})
                was overridden after MobX attached. This may result in a memory leak if the
                overridden reactive render was not properly disposed.`
            )
        }

        this[mobxIsUnmounted] = true
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

function createReactiveRender(originalRender: any) {
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
    const boundOriginalRender = originalRender.bind(this)

    let isRenderingPending = false

    const createReaction = () => {
        const reaction = new Reaction(`${initialName}.render()`, () => {
            if (!isRenderingPending) {
                // N.B. Getting here *before mounting* means that a component constructor has side effects (see the relevant test in misc.test.tsx)
                // This unidiomatic React usage but React will correctly warn about this so we continue as usual
                // See #85 / Pull #44
                isRenderingPending = true
                if (this[mobxIsUnmounted] !== true) {
                    let hasError = true
                    try {
                        setHiddenProp(this, isForcingUpdateKey, true)
                        if (!this[skipRenderKey]) {
                            Component.prototype.forceUpdate.call(this)
                        }
                        hasError = false
                    } finally {
                        setHiddenProp(this, isForcingUpdateKey, false)
                        if (hasError) {
                            reaction.dispose()
                            // Forces reaction to be re-created on next render
                            this.render[mobxAdminProperty] = null
                        }
                    }
                }
            }
        })
        reaction["reactComponent"] = this
        return reaction
    }

    function reactiveRender() {
        isRenderingPending = false
        // Create reaction lazily to support re-mounting #3395
        const reaction = (reactiveRender[mobxAdminProperty] ??= createReaction())
        let exception: unknown = undefined
        let rendering = undefined
        reaction.track(() => {
            try {
                // TODO@major
                // Optimization: replace with _allowStateChangesStart/End (not available in mobx@6.0.0)
                rendering = _allowStateChanges(false, boundOriginalRender)
            } catch (e) {
                exception = e
            }
        })
        if (exception) {
            throw exception
        }
        return rendering
    }

    return reactiveRender
}

function observerSCU(nextProps: React.ClassAttributes<any>, nextState: any): boolean {
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

            // Why this check? BC?
            // @ts-expect-error
            if (_allowStateReadsStart && _allowStateReadsEnd) {
                prevReadState = _allowStateReadsStart(true)
            }
            getAtom.call(this).reportObserved()

            // Why this check? BC?
            // @ts-expect-error
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
