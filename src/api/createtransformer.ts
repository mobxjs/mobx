import { computed } from "./computed"
import { globalState } from "../core/globalstate"
import { invariant, getNextId, addHiddenProp } from "../utils/utils"
import { onBecomeUnobserved } from "./become-observed"

export type ITransformer<A, B> = (object: A) => B

export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    onCleanup?: (resultObject: B | undefined, sourceObject?: A) => void
): ITransformer<A, B> {
    process.env.NODE_ENV !== "production" &&
        invariant(
            typeof transformer === "function" && transformer.length < 2,
            "createTransformer expects a function that accepts one argument"
        )

    // Memoizes: object id -> reactive view that applies transformer to the object
    let views: { [id: number]: () => B } = {}
    // If the resetId changes, we will clear the object cache, see #163
    // This construction is used to avoid leaking refs to the objectCache directly
    let resetId = globalState.resetId

    function createView(sourceIdentifier: string, sourceObject: A) {
        let latestValue: B
        const expr = computed(
            () => {
                return (latestValue = transformer(sourceObject))
            },
            {
                name: `Transformer-${(<any>transformer).name}-${sourceIdentifier}`
            }
        )
        const disposer = onBecomeUnobserved(expr, () => {
            delete views[sourceIdentifier]
            disposer()
            if (onCleanup) onCleanup(latestValue, sourceObject)
        })

        return () => expr.get()
    }

    return (object: A) => {
        if (resetId !== globalState.resetId) {
            views = {}
            resetId = globalState.resetId
        }

        const identifier = getMemoizationId(object)
        let reactiveView = views[identifier]
        if (reactiveView) return reactiveView()
        // Not in cache; create a reactive view
        reactiveView = views[identifier] = createView(identifier, object)
        return reactiveView()
    }
}

function getMemoizationId(object) {
    if (typeof object === "string" || typeof object === "number") return object
    if (object === null || typeof object !== "object")
        throw new Error(
            "[mobx] transform expected some kind of object or primitive value, got: " + object
        )
    let tid = object.$transformId
    if (tid === undefined) {
        tid = getNextId()
        addHiddenProp(object, "$transformId", tid)
    }
    return tid
}
