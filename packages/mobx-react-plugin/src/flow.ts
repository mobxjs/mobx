import type { NodePath, types as t } from "@babel/core"

type Types = typeof t

export interface FlowResult {
    flows: string[]
}

type AnnotationKind = "flow" | "action" | "other"

interface AnnotationEntry {
    kind: AnnotationKind
    bound: boolean
    property: t.ObjectProperty
}

/** `null`: the overrides object could not be analyzed statically. */
type Annotations = Map<string, AnnotationEntry> | null

interface Target {
    /** `auto`: `makeAutoObservable`, `explicit`: `makeObservable` (only `flow` members). */
    mode: "auto" | "explicit"
    annotations: Annotations
}

interface Decision {
    convert: boolean
    /** `{ method: action }` to rewrite to `flow` once the method is converted. */
    rewriteAnnotation?: AnnotationEntry
    /** `@action` decorator to rewrite to `@flow` once the method is converted. */
    rewriteDecorator?: { decorator: t.Decorator; bound: boolean }
}

interface Context {
    t: Types
    program: NodePath<t.Program>
    result: FlowResult
    flowLocal: string | null
    importAdded: boolean
}

/**
 * Turns `async` methods into generator methods, i.e. MobX flows.
 * Only methods MobX will actually turn into flows are converted:
 * classes calling `makeAutoObservable(this)` in their constructor (unless the
 * method is overridden with another annotation), members annotated with `flow`
 * or `action` (which is rewritten to `flow`) in `makeObservable`, methods
 * decorated with `@flow` or `@action` (rewritten to `@flow`), and object literals
 * passed to `makeAutoObservable()` or `makeObservable()`.
 */
export function transformFlows(types: Types, program: NodePath<t.Program>): FlowResult {
    const ctx: Context = {
        t: types,
        program,
        result: { flows: [] },
        flowLocal: null,
        importAdded: false
    }
    program.traverse({
        Class(path) {
            transformClass(ctx, path)
        },
        CallExpression(path) {
            transformObjectCall(ctx, path)
        }
    })
    if (ctx.importAdded) {
        program.scope.crawl()
    }
    return ctx.result
}

function classifyAnnotation(
    ctx: Context,
    node: t.Node | null | undefined
): { kind: AnnotationKind; bound: boolean } {
    const { t } = ctx
    if (t.isIdentifier(node)) {
        if (node.name === "flow" || node.name === "action") {
            return { kind: node.name, bound: false }
        }
        return { kind: "other", bound: false }
    }
    if (
        t.isMemberExpression(node) &&
        !node.computed &&
        t.isIdentifier(node.object) &&
        (node.object.name === "flow" || node.object.name === "action") &&
        t.isIdentifier(node.property, { name: "bound" })
    ) {
        return { kind: node.object.name, bound: true }
    }
    return { kind: "other", bound: false }
}

function memberName(ctx: Context, key: t.Node, computed: boolean): string | null {
    const { t } = ctx
    if (!computed && t.isIdentifier(key)) {
        return key.name
    }
    if (t.isStringLiteral(key)) {
        return key.value
    }
    return null
}

/** Reads `{ method: flow, other: false, ... }`; `null` when it cannot be analyzed. */
function parseAnnotations(ctx: Context, node: t.Node | null | undefined): Annotations {
    const { t } = ctx
    if (node == null || t.isNullLiteral(node) || t.isIdentifier(node, { name: "undefined" })) {
        return new Map()
    }
    if (!t.isObjectExpression(node)) {
        return null
    }
    const annotations = new Map<string, AnnotationEntry>()
    for (const property of node.properties) {
        if (!t.isObjectProperty(property)) {
            return null
        }
        const name = memberName(ctx, property.key, property.computed)
        if (name === null) {
            return null
        }
        annotations.set(name, { ...classifyAnnotation(ctx, property.value), property })
    }
    return annotations
}

function decide(
    ctx: Context,
    target: Target | null,
    name: string,
    decorators: t.Decorator[] | null | undefined
): Decision {
    if (decorators && decorators.length > 0) {
        // `@flow async method() {}` / `@action async method() {}`: the decorator decides.
        if (
            decorators.every(
                decorator => classifyAnnotation(ctx, decorator.expression).kind === "flow"
            )
        ) {
            return { convert: true }
        }
        if (decorators.length === 1) {
            const annotation = classifyAnnotation(ctx, decorators[0].expression)
            if (annotation.kind === "action") {
                return {
                    convert: true,
                    rewriteDecorator: { decorator: decorators[0], bound: annotation.bound }
                }
            }
        }
        return { convert: false }
    }
    if (target === null || target.annotations === null) {
        return { convert: false }
    }
    const entry = target.annotations.get(name)
    if (entry === undefined) {
        return { convert: target.mode === "auto" }
    }
    if (entry.kind === "flow") {
        return { convert: true }
    }
    if (entry.kind === "action") {
        return { convert: true, rewriteAnnotation: entry }
    }
    return { convert: false }
}

function flowExpression(ctx: Context, bound: boolean): t.Expression {
    const { t } = ctx
    const flow = t.identifier(ensureFlowImport(ctx))
    return bound ? t.memberExpression(flow, t.identifier("bound")) : flow
}

function applyRewrites(ctx: Context, decision: Decision): void {
    if (decision.rewriteDecorator) {
        decision.rewriteDecorator.decorator.expression = flowExpression(
            ctx,
            decision.rewriteDecorator.bound
        )
    }
    if (decision.rewriteAnnotation) {
        decision.rewriteAnnotation.property.value = flowExpression(
            ctx,
            decision.rewriteAnnotation.bound
        )
    }
}

type AsyncFunctionPath = NodePath<t.ClassMethod | t.ObjectMethod | t.FunctionExpression>

/**
 * Replaces the function's own `await`s with `yield`s and makes it a generator.
 * Returns false when the function cannot be converted (no `await`, or `for await`).
 */
function convertToGenerator(ctx: Context, fn: AsyncFunctionPath): boolean {
    const { t } = ctx
    const awaits: NodePath<t.AwaitExpression>[] = []
    let convertible = true
    fn.get("body").traverse({
        Function(inner) {
            // `await` inside nested functions belongs to them.
            inner.skip()
        },
        ForOfStatement(loop) {
            if (loop.node.await) {
                convertible = false
            }
        },
        AwaitExpression(expr) {
            awaits.push(expr)
        }
    })
    if (!convertible || awaits.length === 0) {
        return false
    }
    for (const expr of awaits) {
        expr.replaceWith(t.yieldExpression(expr.node.argument))
    }
    fn.node.async = false
    fn.node.generator = true
    return true
}

function findClassTarget(ctx: Context, cls: NodePath<t.Class>): Target | null {
    const { t } = ctx
    const constructor = cls
        .get("body")
        .get("body")
        .find(member => member.isClassMethod() && member.node.kind === "constructor")
    if (!constructor) {
        return null
    }
    let target: Target | null = null
    constructor.traverse({
        Function(inner) {
            inner.skip()
        },
        CallExpression(call) {
            const callee = call.node.callee
            const args = call.node.arguments
            if (!t.isIdentifier(callee) || !t.isThisExpression(args[0])) {
                return
            }
            if (callee.name === "makeAutoObservable") {
                target = { mode: "auto", annotations: parseAnnotations(ctx, args[1]) }
            } else if (callee.name === "makeObservable") {
                target = { mode: "explicit", annotations: parseAnnotations(ctx, args[1]) }
            }
        }
    })
    return target
}

function transformClass(ctx: Context, cls: NodePath<t.Class>): void {
    const target = findClassTarget(ctx, cls)
    const className = cls.node.id ? cls.node.id.name : "<anonymous>"
    for (const member of cls.get("body").get("body")) {
        if (!member.isClassMethod()) {
            continue
        }
        const node = member.node
        if (node.kind !== "method" || node.static || !node.async || node.generator) {
            continue
        }
        const name = memberName(ctx, node.key, node.computed)
        if (name === null) {
            continue
        }
        const decision = decide(ctx, target, name, node.decorators)
        if (!decision.convert || !convertToGenerator(ctx, member)) {
            continue
        }
        applyRewrites(ctx, decision)
        ctx.result.flows.push(`${className}.${name}`)
    }
}

function objectLiteralOf(ctx: Context, node: t.Node | undefined): t.ObjectExpression | null {
    return ctx.t.isObjectExpression(node) ? node : null
}

function findObjectTarget(
    ctx: Context,
    call: NodePath<t.CallExpression>
): { object: t.ObjectExpression; target: Target } | null {
    const { t } = ctx
    const callee = call.node.callee
    const args = call.node.arguments
    if (!t.isIdentifier(callee)) {
        return null
    }
    if (callee.name === "makeObservable") {
        const object = objectLiteralOf(ctx, args[0])
        return object
            ? { object, target: { mode: "explicit", annotations: parseAnnotations(ctx, args[1]) } }
            : null
    }
    if (callee.name !== "makeAutoObservable") {
        return null
    }
    const object = objectLiteralOf(ctx, args[0])
    return object
        ? { object, target: { mode: "auto", annotations: parseAnnotations(ctx, args[1]) } }
        : null
}

function transformObjectCall(ctx: Context, call: NodePath<t.CallExpression>): void {
    const found = findObjectTarget(ctx, call)
    if (!found) {
        return
    }
    const { object, target } = found
    let objectPath: NodePath<t.ObjectExpression> | null = null
    call.traverse({
        ObjectExpression(p) {
            if (p.node === object) {
                objectPath = p
                p.stop()
            }
        }
    })
    if (!objectPath) {
        return
    }
    for (const property of (objectPath as NodePath<t.ObjectExpression>).get("properties")) {
        let fn: AsyncFunctionPath | null = null
        let name: string | null = null
        if (property.isObjectMethod()) {
            if (property.node.kind !== "method") {
                continue
            }
            name = memberName(ctx, property.node.key, property.node.computed)
            fn = property
        } else if (property.isObjectProperty()) {
            const value = property.get("value")
            // Arrow functions are left alone: turning them into generators would rebind `this`.
            if (!value.isFunctionExpression()) {
                continue
            }
            name = memberName(ctx, property.node.key, property.node.computed)
            fn = value
        }
        if (!fn || name === null || !fn.node.async || fn.node.generator) {
            continue
        }
        const decision = decide(ctx, target, name, null)
        if (!decision.convert || !convertToGenerator(ctx, fn)) {
            continue
        }
        applyRewrites(ctx, decision)
        ctx.result.flows.push(`<object>.${name}`)
    }
}

function ensureFlowImport(ctx: Context): string {
    if (ctx.flowLocal !== null) {
        return ctx.flowLocal
    }
    const { t, program } = ctx
    let lastImport: NodePath<t.ImportDeclaration> | null = null
    let mobxImport: NodePath<t.ImportDeclaration> | null = null
    for (const stmt of program.get("body")) {
        if (!stmt.isImportDeclaration()) {
            continue
        }
        lastImport = stmt
        const node = stmt.node
        if (
            node.importKind === "type" ||
            node.importKind === "typeof" ||
            node.source.value !== "mobx"
        ) {
            continue
        }
        for (const spec of node.specifiers) {
            if (!t.isImportSpecifier(spec) || spec.importKind === "type") {
                continue
            }
            const imported = t.isIdentifier(spec.imported)
                ? spec.imported.name
                : spec.imported.value
            if (imported === "flow") {
                ctx.flowLocal = spec.local.name
                return spec.local.name
            }
        }
        if (
            mobxImport === null &&
            !node.specifiers.some(spec => t.isImportNamespaceSpecifier(spec))
        ) {
            mobxImport = stmt
        }
    }
    const scope = program.scope
    const local =
        scope.hasBinding("flow") || scope.hasGlobal("flow") || scope.hasReference("flow")
            ? scope.generateUidIdentifier("flow").name
            : "flow"
    if (program.node.sourceType === "module") {
        const specifier = t.importSpecifier(t.identifier(local), t.identifier("flow"))
        if (mobxImport) {
            mobxImport.node.specifiers.push(specifier)
        } else {
            const declaration = t.importDeclaration([specifier], t.stringLiteral("mobx"))
            if (lastImport) {
                lastImport.insertAfter(declaration)
            } else {
                program.unshiftContainer("body", declaration)
            }
        }
    } else {
        program.unshiftContainer(
            "body",
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.objectPattern([
                        t.objectProperty(
                            t.identifier("flow"),
                            t.identifier(local),
                            false,
                            local === "flow"
                        )
                    ]),
                    t.callExpression(t.identifier("require"), [t.stringLiteral("mobx")])
                )
            ])
        )
    }
    ctx.flowLocal = local
    ctx.importAdded = true
    return local
}
