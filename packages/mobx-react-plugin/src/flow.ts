import type { NodePath, types as t } from "@babel/core"
import { addImport, findImport } from "./imports"

type Types = typeof t

const MOBX_SOURCE = "mobx"
const FLOW_NAME = "flow"
const FLOW_BOUND_NAME = "flowBound"

export interface FlowResult {
    flows: string[]
}

type AnnotationKind = "flow" | "action" | "other"

interface Classification {
    kind: AnnotationKind
    bound: boolean
}

const KNOWN_ANNOTATIONS = new Map<string, Classification>([
    [FLOW_NAME, { kind: "flow", bound: false }],
    [FLOW_BOUND_NAME, { kind: "flow", bound: true }],
    ["action", { kind: "action", bound: false }],
    ["actionBound", { kind: "action", bound: true }]
])

const OTHER_ANNOTATION: Classification = { kind: "other", bound: false }

interface AnnotationEntry extends Classification {
    property: t.ObjectProperty
}

type Annotations = Map<string, AnnotationEntry> | null

interface Target {
    mode: "auto" | "explicit"
    annotations: Annotations
}

interface Decision {
    convert: boolean
    rewriteAnnotation?: AnnotationEntry
    rewriteDecorator?: { decorator: t.Decorator; bound: boolean }
}

interface Context {
    t: Types
    program: NodePath<t.Program>
    result: FlowResult
    imports: Map<string, string>
}

export function transformFlows(types: Types, program: NodePath<t.Program>): FlowResult {
    const ctx: Context = {
        t: types,
        program,
        result: { flows: [] },
        imports: new Map()
    }
    program.traverse({
        Class(path) {
            transformClass(ctx, path)
        },
        CallExpression(path) {
            transformObjectCall(ctx, path)
        }
    })
    return ctx.result
}

function classifyAnnotation(ctx: Context, node: t.Node | null | undefined): Classification {
    const known = ctx.t.isIdentifier(node) ? KNOWN_ANNOTATIONS.get(node.name) : undefined
    return known ?? OTHER_ANNOTATION
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
    return ctx.t.identifier(ensureMobxImport(ctx, bound ? FLOW_BOUND_NAME : FLOW_NAME))
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

function convertToGenerator(ctx: Context, fn: AsyncFunctionPath): boolean {
    const { t } = ctx
    const awaits: NodePath<t.AwaitExpression>[] = []
    let convertible = true
    fn.get("body").traverse({
        Function(inner) {
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

function ensureMobxImport(ctx: Context, name: string): string {
    let local = ctx.imports.get(name) ?? findImport(ctx.t, ctx.program, name, [MOBX_SOURCE])
    if (local === null) {
        local = addImport(ctx.t, ctx.program, name, MOBX_SOURCE)
    }
    ctx.imports.set(name, local)
    return local
}
