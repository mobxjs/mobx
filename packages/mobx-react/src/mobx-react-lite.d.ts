declare module "mobx-react-lite" {
    import type * as React from "react"
    import type { AnnotationsMap } from "mobx"

    export function observer<C extends React.FunctionComponent<any>>(
        component: C
    ): C & React.MemoExoticComponent<C>
    export function observer<P extends object>(
        component: React.FunctionComponent<P>
    ): React.FunctionComponent<P> & React.MemoExoticComponent<React.FunctionComponent<P>>
    export function observer<P extends object, TRef = {}>(
        component: React.ForwardRefExoticComponent<
            React.PropsWithoutRef<P> & React.RefAttributes<TRef>
        >
    ): React.MemoExoticComponent<
        React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
    >

    export function Observer(props: {
        children?(): React.ReactElement | null
        render?(): React.ReactElement | null
    }): React.ReactElement | null

    export function useLocalObservable<TStore extends object>(
        initializer: () => TStore,
        annotations?: AnnotationsMap<TStore, never>
    ): TStore

    export function enableStaticRendering(enable: boolean): void
    export function isUsingStaticRendering(): boolean

    export const _observerFinalizationRegistry: {
        register(target: object, value: unknown, token?: object): void
        unregister(token: object): void
        finalizeAllImmediately?: () => void
    }
    export const clearTimers: () => void
}
