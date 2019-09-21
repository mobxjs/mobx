import { invariant, startActionWithFinisher } from "../internal"

let runId = 0

interface IAsyncActionContext {
    runId: number
    step: number
    finisher: ReturnType<typeof startActionWithFinisher>
    actionName: string
    scope: any
    args: IArguments | undefined
}

interface IAsyncActionContextRef {
    current: IAsyncActionContext | undefined
}

function assertAsyncActionContextExists(ctx: IAsyncActionContext | undefined) {
    if (!ctx) {
        fail(
            `async action context not present. did you await inside an asyncAction without using 'awaiter(promise)'?`
        )
    }
}

function assertAsyncActionContextNotExists(ctx: IAsyncActionContext | undefined) {
    if (ctx) {
        fail(
            `async action context already present. did you await inside an asyncAction without using 'awaiter(promise)'?`
        )
    }
}

export async function defaultAwaiter<R>(
    ctxRef: IAsyncActionContextRef,
    promiseGen: () => Promise<R>
): Promise<R> {
    if (process.env.NODE_ENV !== "production") {
        invariant(
            typeof promiseGen === "function",
            "async awaiter expects a function that returns a promise"
        )
    }

    assertAsyncActionContextExists(ctxRef.current)

    const { runId, actionName, args, scope, finisher, step } = ctxRef.current!
    const nextStep = step + 1
    ctxRef.current = undefined
    finisher(false)

    try {
        return await promiseGen()
    } finally {
        assertAsyncActionContextNotExists(ctxRef.current)
        ctxRef.current = {
            runId,
            step: nextStep,
            finisher: startActionWithFinisher(
                getAsyncActionName(actionName, runId, nextStep),
                this,
                args
            ),
            actionName,
            args,
            scope
        }
    }
}

export type AsyncActionAwaiter = <R>(promiseGen: () => Promise<R>) => Promise<R>

export function asyncAction<ActionArgs extends any[], ActionResult>(
    name: string,
    fn: (awaiter: AsyncActionAwaiter, ...args: ActionArgs) => Promise<ActionResult>
): (...args: ActionArgs) => Promise<ActionResult>
export function asyncAction<Args extends any[], R>(
    fn: (awaiter: AsyncActionAwaiter, ...args: Args) => Promise<R>
): (...args: Args) => Promise<R>

export function asyncAction(arg1?: any, arg2?: any): any {
    const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>"
    const fn = typeof arg1 === "function" ? arg1 : arg2

    if (process.env.NODE_ENV !== "production") {
        invariant(typeof fn === "function", "`asyncAction` expects a function")
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`)
    }

    return async function(this: any) {
        const nextRunId = runId++
        const ctxRef: IAsyncActionContextRef = {
            current: {
                runId: nextRunId,
                step: 0,
                finisher: startActionWithFinisher(
                    getAsyncActionName(actionName, nextRunId, 0),
                    this,
                    arguments
                ),
                actionName,
                args: arguments,
                scope: this
            }
        }
        const awaiter = defaultAwaiter.bind(this, ctxRef)

        let threw = true
        try {
            const ret = await fn.call(this, awaiter, ...arguments)
            threw = false
            return ret
        } finally {
            assertAsyncActionContextExists(ctxRef.current)

            const finisher = ctxRef.current!.finisher
            ctxRef.current = undefined
            finisher(threw)
        }
    }
}

function getAsyncActionName(actionName: string, runId: number, step: number) {
    return `${actionName} - runid ${runId} - step ${step}`
}
