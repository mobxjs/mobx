export type Stage2Decorator = {
    kind: "field" | "method" | "class" | "hook"
    key?: string
    placement: "static" | "prototype" | "own"
    descriptor?: PropertyDescriptor
    initializer?: () => any
    finisher?: (klass) => void
    extras?: Stage2Decorator[]
}

export function quacksLikeAStage2Decorator(args: IArguments): boolean {
    return args.length === 1 && args[0] && (args[0].kind === "field" || args[0].kind === "method")
}
