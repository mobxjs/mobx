import { ReactionScheduler } from "mobx"
import React, { forwardRef, memo } from "react"

import { isUsingStaticRendering } from "./staticRendering"
import { useScheduledObserver } from "./useScheduledObserver"

const hasSymbol = typeof Symbol === "function" && Symbol.for
const isFunctionNameConfigurable =
    Object.getOwnPropertyDescriptor(() => {}, "name")?.configurable ?? false

// Using react-is had some issues (and operates on elements, not on types), see #608 / #609
const ReactForwardRefSymbol = hasSymbol
    ? Symbol.for("react.forward_ref")
    : typeof forwardRef === "function" && forwardRef((props: any) => null)["$$typeof"]

const ReactMemoSymbol = hasSymbol
    ? Symbol.for("react.memo")
    : typeof memo === "function" && memo((props: any) => null)["$$typeof"]

/**
 * A function that wraps the tracked render output during stale windows.
 * Called in the outer (non-tracked) layer, so it can freely use `isStale`
 * without consuming the pending reaction.
 *
 * **Important:** The returned element must always include `children` in the
 * React tree. Omitting `children` when stale will unmount the inner tracked
 * component, disposing its MobX reaction and preventing recovery. To show a
 * skeleton or placeholder, render `children` hidden (e.g. `display: "none"`)
 * alongside the placeholder content.
 *
 * @param children - The last rendered output from the tracked component
 * @param isStale - Whether dependencies have changed but the scheduler hasn't run yet
 */
export type StaleWrapper = (children: React.ReactNode, isStale: boolean) => React.ReactElement

// Internal context to pass setIsStale from outer to inner component
const SetStaleContext = React.createContext<((stale: boolean) => void) | null>(null)

/**
 * Creates a scheduled observer HOC that uses ScheduledReaction to defer
 * reaction execution. This can improve UI responsiveness when observing
 * expensive computed values.
 *
 * @param scheduler - A ReactionScheduler that controls when reactions run
 * @param defaultStaleWrapper - Optional default StaleWrapper applied to all components
 *   created by this factory. Can be overridden per-component.
 * @returns An observer HOC that uses the provided scheduler
 *
 * @example
 * ```tsx
 * const deferredObserver = scheduledObserver(createRAFScheduler())
 *
 * // Simple — no stale awareness
 * const MyComponent = deferredObserver(function MyComponent() {
 *   return <div>{store.expensiveComputedValue}</div>
 * })
 *
 * // With stale awareness — second arg wraps the output
 * const MyComponent = deferredObserver(
 *   function MyComponent() {
 *     return <div>{store.expensiveComputedValue}</div>
 *   },
 *   (children, isStale) => (
 *     <div style={{ opacity: isStale ? 0.5 : 1 }}>{children}</div>
 *   )
 * )
 *
 * // Default stale wrapper for all components using this scheduler
 * const deferredObserver = scheduledObserver(
 *   createRAFScheduler(),
 *   (children, isStale) => (
 *     <div style={{ opacity: isStale ? 0.5 : 1 }}>{children}</div>
 *   )
 * )
 * // All components get the default wrapper automatically
 * const MyComponent = deferredObserver(function MyComponent() {
 *   return <div>{store.expensiveComputedValue}</div>
 * })
 * // Per-component override
 * const OtherComponent = deferredObserver(
 *   function OtherComponent() { ... },
 *   (children, isStale) => (
 *     <div style={{ pointerEvents: isStale ? 'none' : 'auto' }}>{children}</div>
 *   )
 * )
 * ```
 *
 * **Important:** The `staleWrapper` must always render `children` in the
 * returned element tree. The inner tracked component is a child of the wrapper —
 * removing `children` from the tree unmounts it, disposing the MobX reaction
 * permanently. To show a skeleton or placeholder while stale, hide `children`
 * with CSS (e.g. `display: "none"`) rather than omitting them.
 */
export function scheduledObserver(
    scheduler: ReactionScheduler,
    defaultStaleWrapper?: StaleWrapper
) {
    // Return an observer HOC factory
    function observerWithScheduler<P extends object>(
        baseComponent: React.FunctionComponent<P>,
        staleWrapper?: StaleWrapper
    ): React.FunctionComponent<P>

    function observerWithScheduler<P extends object, TRef = {}>(
        baseComponent: React.ForwardRefExoticComponent<
            React.PropsWithoutRef<P> & React.RefAttributes<TRef>
        >,
        staleWrapper?: StaleWrapper
    ): React.MemoExoticComponent<
        React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
    >

    function observerWithScheduler<P extends object, TRef = {}>(
        baseComponent:
            | React.ForwardRefRenderFunction<TRef, P>
            | React.FunctionComponent<P>
            | React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>,
        staleWrapper?: StaleWrapper
    ) {
        if (ReactMemoSymbol && baseComponent["$$typeof"] === ReactMemoSymbol) {
            throw new Error(
                `[mobx-react-lite] You are trying to use \`scheduledObserver\` on a function component wrapped in either another \`observer\` or \`React.memo\`. The observer already applies 'React.memo' for you.`
            )
        }

        if (isUsingStaticRendering()) {
            return baseComponent
        }

        let useForwardRef = false
        let render = baseComponent

        const baseComponentName = baseComponent.displayName || baseComponent.name

        // If already wrapped with forwardRef, unwrap,
        // so we can patch render and apply memo
        if (ReactForwardRefSymbol && baseComponent["$$typeof"] === ReactForwardRefSymbol) {
            useForwardRef = true
            render = baseComponent["render"]
            if (typeof render !== "function") {
                throw new Error(
                    `[mobx-react-lite] \`render\` property of ForwardRef was not a function`
                )
            }
        }

        // Per-component staleWrapper overrides the default
        const effectiveStaleWrapper = staleWrapper ?? defaultStaleWrapper

        if (effectiveStaleWrapper) {
            // Two-layer structure: outer manages stale state, inner does tracked render.
            // This is necessary because re-rendering inside reaction.track() would consume
            // the pending reaction, preventing the scheduler's runReaction_() from working.

            // Inner component: memo'd, does the actual tracked render
            let innerComponent = (props: any, ref: React.Ref<TRef>) => {
                const setIsStale = React.useContext(SetStaleContext)
                return useScheduledObserver(
                    () => render(props, ref),
                    scheduler,
                    baseComponentName,
                    {
                        onStale: () => setIsStale?.(true),
                        onFresh: () => setIsStale?.(false)
                    }
                )
            }

            if (useForwardRef) {
                innerComponent = forwardRef(innerComponent)
            }

            const InnerMemo = memo(innerComponent)

            // Outer component: manages stale state, calls staleWrapper
            let outerComponent: any = (props: any, ref: React.Ref<TRef>) => {
                const [isStale, setIsStale] = React.useState(false)
                const innerProps = useForwardRef ? { ...props, ref } : props
                const children = React.createElement(InnerMemo, innerProps)
                return React.createElement(
                    SetStaleContext.Provider,
                    { value: setIsStale },
                    effectiveStaleWrapper(children, isStale)
                )
            }

            // Inherit original name and displayName
            ;(outerComponent as React.FunctionComponent).displayName = baseComponent.displayName

            if (isFunctionNameConfigurable) {
                Object.defineProperty(outerComponent, "name", {
                    value: baseComponent.name,
                    writable: true,
                    configurable: true
                })
            }

            if ((baseComponent as any).contextTypes) {
                ;(outerComponent as React.FunctionComponent).contextTypes = (
                    baseComponent as any
                ).contextTypes
            }

            if (useForwardRef) {
                outerComponent = forwardRef(outerComponent)
            }

            copyStaticProperties(baseComponent, outerComponent)

            return outerComponent
        }

        let observerComponent = (props: any, ref: React.Ref<TRef>) => {
            return useScheduledObserver(() => render(props, ref), scheduler, baseComponentName)
        }

        // Inherit original name and displayName
        ;(observerComponent as React.FunctionComponent).displayName = baseComponent.displayName

        if (isFunctionNameConfigurable) {
            Object.defineProperty(observerComponent, "name", {
                value: baseComponent.name,
                writable: true,
                configurable: true
            })
        }

        // Support legacy context: `contextTypes` must be applied before `memo`
        if ((baseComponent as any).contextTypes) {
            ;(observerComponent as React.FunctionComponent).contextTypes = (
                baseComponent as any
            ).contextTypes
        }

        if (useForwardRef) {
            // `forwardRef` must be applied prior `memo`
            observerComponent = forwardRef(observerComponent)
        }

        // memo; we are not interested in deep updates
        // in props; we assume that if deep objects are changed,
        // this is in observables, which would have been tracked anyway
        observerComponent = memo(observerComponent)

        copyStaticProperties(baseComponent, observerComponent)

        return observerComponent
    }

    return observerWithScheduler
}

// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
const hoistBlackList: any = {
    $$typeof: true,
    render: true,
    compare: true,
    type: true,
    // Don't redefine `displayName`,
    // it's defined as getter-setter pair on `memo` (see #3192).
    displayName: true
}

function copyStaticProperties(base: any, target: any) {
    Object.keys(base).forEach(key => {
        if (!hoistBlackList[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key)!)
        }
    })
}
