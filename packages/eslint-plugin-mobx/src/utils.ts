const mobxDecorators = new Set([
    "observable",
    "observableRef",
    "observableShallow",
    "observableDeep",
    "observableStruct",
    "computed",
    "computedStruct",
    "action",
    "actionBound",
    "flow",
    "flowBound",
    "override"
])

export function isMobxDecorator(decorator) {
    const { expression } = decorator
    return mobxDecorators.has(expression.name) || mobxDecorators.has(expression.callee?.name)
}

export function findAncestor(node, match) {
    const { parent } = node
    if (!parent) return
    if (match(parent)) return parent
    return findAncestor(parent, match)
}

export function assert(expr, error?) {
    if (!expr) {
        error ??= "Assertion failed"
        error = error instanceof Error ? error : new Error(error)
        throw error
    }
}
