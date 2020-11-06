import { forwardRef, memo } from "react"

import { isUsingStaticRendering } from "./staticRendering"
import { useObserver } from "./useObserver"

export interface IObserverOptions {
    readonly forwardRef?: boolean
}

export function observer<P extends object, TRef = {}>(
    baseComponent: React.RefForwardingComponent<TRef, P>,
    options: IObserverOptions & { forwardRef: true }
): React.MemoExoticComponent<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
>

export function observer<P extends object>(
    baseComponent: React.FunctionComponent<P>,
    options?: IObserverOptions
): React.FunctionComponent<P>

export function observer<
    C extends React.FunctionComponent<any> | React.RefForwardingComponent<any>,
    Options extends IObserverOptions
>(
    baseComponent: C,
    options?: Options
): Options extends { forwardRef: true }
    ? C extends React.RefForwardingComponent<infer TRef, infer P>
        ? C &
              React.MemoExoticComponent<
                  React.ForwardRefExoticComponent<
                      React.PropsWithoutRef<P> & React.RefAttributes<TRef>
                  >
              >
        : never /* forwardRef set for a non forwarding component */
    : C & { displayName: string }

// n.b. base case is not used for actual typings or exported in the typing files
export function observer<P extends object, TRef = {}>(
    baseComponent: React.RefForwardingComponent<TRef, P> | React.FunctionComponent<P>,
    options?: IObserverOptions
) {
    // The working of observer is explained step by step in this talk: https://www.youtube.com/watch?v=cPF4iBedoF0&feature=youtu.be&t=1307
    if (isUsingStaticRendering()) {
        return baseComponent
    }

    const realOptions = {
        forwardRef: false,
        ...options
    }

    const baseComponentName = baseComponent.displayName || baseComponent.name

    const wrappedComponent = (props: P, ref: React.Ref<TRef>) => {
        return useObserver(() => baseComponent(props, ref), baseComponentName)
    }
    wrappedComponent.displayName = baseComponentName

    // memo; we are not interested in deep updates
    // in props; we assume that if deep objects are changed,
    // this is in observables, which would have been tracked anyway
    let memoComponent
    if (realOptions.forwardRef) {
        // we have to use forwardRef here because:
        // 1. it cannot go before memo, only after it
        // 2. forwardRef converts the function into an actual component, so we can't let the baseComponent do it
        //    since it wouldn't be a callable function anymore
        memoComponent = memo(forwardRef(wrappedComponent))
    } else {
        memoComponent = memo(wrappedComponent)
    }

    copyStaticProperties(baseComponent, memoComponent)
    memoComponent.displayName = baseComponentName

    return memoComponent
}

// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
const hoistBlackList: any = {
    $$typeof: true,
    render: true,
    compare: true,
    type: true
}

function copyStaticProperties(base: any, target: any) {
    Object.keys(base).forEach(key => {
        if (!hoistBlackList[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key)!)
        }
    })
}
