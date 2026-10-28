import type { NodePath, types as t } from "@babel/core"
import type { Binding } from "@babel/traverse"
import * as path from "path"
import { addImport, findImport } from "./imports"
import type { NormalizedObserverOptions } from "./options"

type Types = typeof t

type FunctionPath = NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
>
type CallPath = NodePath<t.CallExpression>
type WrapperKind = "observer" | "forwardRef" | "memo"

interface Wrapper {
    kind: WrapperKind
    call: CallPath
}

const OPT_IN_DIRECTIVES = new Set(["use memo", "use forget"])
const OPT_OUT_DIRECTIVES = new Set(["use no memo", "use no forget"])
const NO_MEMO_DIRECTIVE = "use no memo"

const HOOK_NAME_RE = /^use[A-Z0-9]/
const COMPONENT_NAME_RE = /^[A-Z]/
const OBSERVER_NAME = "observer"
const OBSERVER_SOURCE = "mobx-react-plugin/observer"
const KNOWN_OBSERVER_SOURCES = [OBSERVER_SOURCE, "mobx-react", "mobx-react-lite"]

export interface TransformResult {
    wrapped: string[]
    directives: string[]
    aliased: string[]
}

type Site =
    | { kind: "declaration"; exportKind: null | "named" | "default" }
    | { kind: "declarator"; declarator: NodePath<t.VariableDeclarator> }
    | { kind: "default-expression"; exportDecl: NodePath<t.ExportDefaultDeclaration> }

interface Candidate {
    fn: FunctionPath
    name: string | null
    binding: Binding | null
    wrappers: Wrapper[]
    site: Site
}

interface Context {
    t: Types
    program: NodePath<t.Program>
    opts: NormalizedObserverOptions
    filename: string | undefined
    result: TransformResult
    handled: Set<t.Node>
    observerLocal: string | null
    observedNames: Set<string>
    forwardRefNames: Set<string>
    forwardRefCalls: CallPath[]
    changed: boolean
}

export function transformProgram(
    types: Types,
    program: NodePath<t.Program>,
    opts: NormalizedObserverOptions,
    filename?: string
): TransformResult {
    const ctx: Context = {
        t: types,
        program,
        opts,
        filename,
        result: { wrapped: [], directives: [], aliased: [] },
        handled: new Set(),
        observerLocal: findImport(types, program, OBSERVER_NAME, KNOWN_OBSERVER_SOURCES),
        observedNames: new Set(),
        forwardRefNames: new Set(),
        forwardRefCalls: [],
        changed: false
    }

    const moduleOptOut = program.node.directives.some(d => OPT_OUT_DIRECTIVES.has(d.value.value))
    const addDirectives = opts.useNoMemo && !moduleOptOut

    collectWrapperReferences(ctx)
    for (const candidate of collectCandidates(ctx)) {
        processCandidate(ctx, candidate, addDirectives)
    }
    if (addDirectives) {
        addDirectivesToRemainingFunctions(ctx)
    }
    if (ctx.changed) {
        program.scope.crawl()
    }
    return ctx.result
}

function getWrapperKind(ctx: Context, callee: NodePath): WrapperKind | null {
    const { t } = ctx
    const node = callee.node
    if (t.isIdentifier(node)) {
        if (node.name === OBSERVER_NAME || node.name === ctx.observerLocal) {
            return "observer"
        }
        if (node.name === "forwardRef" || node.name === "memo") {
            return node.name
        }
        return null
    }
    if (t.isMemberExpression(node) && !node.computed && t.isIdentifier(node.property)) {
        const property = node.property.name
        if (property === OBSERVER_NAME) {
            return "observer"
        }
        if (
            (property === "forwardRef" || property === "memo") &&
            t.isIdentifier(node.object) &&
            node.object.name === "React"
        ) {
            return property
        }
    }
    return null
}

function collectWrapperReferences(ctx: Context): void {
    const { program } = ctx
    program.traverse({
        CallExpression(call) {
            const kind = getWrapperKind(ctx, call.get("callee"))
            if (kind === null) {
                return
            }
            const arg = call.get("arguments")[0]
            if (!arg || !arg.isIdentifier()) {
                return
            }
            const name = arg.node.name
            const binding = call.scope.getBinding(name)
            if (!binding || binding.scope !== program.scope) {
                return
            }
            if (kind === "observer") {
                ctx.observedNames.add(name)
            } else if (kind === "forwardRef") {
                ctx.forwardRefNames.add(name)
                ctx.forwardRefCalls.push(call)
            }
        }
    })
}

function unwrapWrappers(
    ctx: Context,
    expr: NodePath<t.Expression>
): { fn: NodePath<t.FunctionExpression | t.ArrowFunctionExpression>; wrappers: Wrapper[] } | null {
    const wrappers: Wrapper[] = []
    let current: NodePath = expr
    while (current.isCallExpression()) {
        const kind = getWrapperKind(ctx, current.get("callee"))
        const args = current.get("arguments")
        if (kind === null || args.length === 0) {
            return null
        }
        wrappers.push({ kind, call: current })
        current = args[0]
    }
    if (current.isFunctionExpression() || current.isArrowFunctionExpression()) {
        return { fn: current, wrappers }
    }
    return null
}

function collectCandidates(ctx: Context): Candidate[] {
    const candidates: Candidate[] = []
    const push = (candidate: Candidate | null) => {
        if (candidate) {
            candidates.push(candidate)
        }
    }
    for (const stmt of ctx.program.get("body")) {
        if (stmt.isFunctionDeclaration()) {
            push(fromDeclaration(ctx, stmt, null))
        } else if (stmt.isVariableDeclaration()) {
            for (const declarator of stmt.get("declarations")) {
                push(fromDeclarator(ctx, declarator))
            }
        } else if (stmt.isExportNamedDeclaration()) {
            const decl = stmt.get("declaration")
            if (decl.isFunctionDeclaration()) {
                push(fromDeclaration(ctx, decl, "named"))
            } else if (decl.isVariableDeclaration()) {
                for (const declarator of decl.get("declarations")) {
                    push(fromDeclarator(ctx, declarator))
                }
            }
        } else if (stmt.isExportDefaultDeclaration()) {
            const decl = stmt.get("declaration")
            if (decl.isFunctionDeclaration()) {
                push(fromDeclaration(ctx, decl, "default"))
            } else if (decl.isExpression()) {
                const unwrapped = unwrapWrappers(ctx, decl)
                if (unwrapped) {
                    const node = unwrapped.fn.node
                    const id = ctx.t.isFunctionExpression(node) ? node.id : null
                    push({
                        fn: unwrapped.fn,
                        name: id ? id.name : inferNameFromFilename(ctx),
                        binding: null,
                        wrappers: unwrapped.wrappers,
                        site: { kind: "default-expression", exportDecl: stmt }
                    })
                }
            }
        }
    }
    return candidates
}

function fromDeclaration(
    ctx: Context,
    decl: NodePath<t.FunctionDeclaration>,
    exportKind: null | "named" | "default"
): Candidate {
    const id = decl.node.id
    return {
        fn: decl,
        name: id ? id.name : exportKind === "default" ? inferNameFromFilename(ctx) : null,
        binding: id ? ctx.program.scope.getBinding(id.name) ?? null : null,
        wrappers: [],
        site: { kind: "declaration", exportKind }
    }
}

function fromDeclarator(
    ctx: Context,
    declarator: NodePath<t.VariableDeclarator>
): Candidate | null {
    const id = declarator.get("id")
    const init = declarator.get("init")
    if (!id.isIdentifier() || !init.node) {
        return null
    }
    const unwrapped = unwrapWrappers(ctx, init as NodePath<t.Expression>)
    if (!unwrapped) {
        return null
    }
    return {
        fn: unwrapped.fn,
        name: id.node.name,
        binding: ctx.program.scope.getBinding(id.node.name) ?? null,
        wrappers: unwrapped.wrappers,
        site: { kind: "declarator", declarator }
    }
}

function inferNameFromFilename(ctx: Context): string | null {
    const { filename } = ctx
    if (!filename) {
        return null
    }
    let stem = path.basename(filename).replace(/\.[^.]+$/, "")
    if (/^index$/i.test(stem)) {
        stem = path.basename(path.dirname(filename))
    }
    const parts = stem.split(/[^A-Za-z0-9]+/).filter(Boolean)
    if (parts.length === 0) {
        return null
    }
    const name = parts.map(part => part[0].toUpperCase() + part.slice(1)).join("")
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        return null
    }
    const scope = ctx.program.scope
    if (scope.hasBinding(name) || scope.hasGlobal(name) || scope.hasReference(name)) {
        return null
    }
    return name
}

// Mirrors getComponentOrHookLike and its helpers in babel-plugin-react-compiler's Program.ts
function isHookNameNode(ctx: Context, node: t.Node | null | undefined): boolean {
    const { t } = ctx
    if (t.isIdentifier(node)) {
        return HOOK_NAME_RE.test(node.name)
    }
    if (
        t.isMemberExpression(node) &&
        !node.computed &&
        t.isIdentifier(node.property) &&
        HOOK_NAME_RE.test(node.property.name)
    ) {
        return t.isIdentifier(node.object) && COMPONENT_NAME_RE.test(node.object.name)
    }
    return false
}

interface BodyScan {
    rootJsx: boolean
    deepJsx: boolean
    rootHooks: boolean
}

function scanBody(ctx: Context, fn: FunctionPath): BodyScan {
    const { t } = ctx
    const scan: BodyScan = { rootJsx: false, deepJsx: false, rootHooks: false }
    const root = fn.node
    const isNested = (p: NodePath) => {
        let parent: NodePath | null = p.parentPath
        while (parent && parent.node !== root) {
            if (
                parent.isArrowFunctionExpression() ||
                parent.isFunctionExpression() ||
                parent.isFunctionDeclaration()
            ) {
                return true
            }
            parent = parent.parentPath
        }
        return false
    }
    fn.traverse({
        JSXElement(p) {
            scan.deepJsx = true
            if (!isNested(p)) {
                scan.rootJsx = true
            }
        },
        JSXFragment(p) {
            scan.deepJsx = true
            if (!isNested(p)) {
                scan.rootJsx = true
            }
        },
        CallExpression(call) {
            if (!scan.rootHooks && isHookNameNode(ctx, call.node.callee) && !isNested(call)) {
                scan.rootHooks = true
            }
        }
    })
    void t
    return scan
}

function isValidPropsAnnotation(ctx: Context, annotation: t.Node | null | undefined): boolean {
    const { t } = ctx
    if (annotation == null || t.isNoop(annotation)) {
        return true
    }
    if (t.isTSTypeAnnotation(annotation)) {
        switch (annotation.typeAnnotation.type) {
            case "TSArrayType":
            case "TSBigIntKeyword":
            case "TSBooleanKeyword":
            case "TSConstructorType":
            case "TSFunctionType":
            case "TSLiteralType":
            case "TSNeverKeyword":
            case "TSNumberKeyword":
            case "TSStringKeyword":
            case "TSSymbolKeyword":
            case "TSTupleType":
                return false
        }
        return true
    }
    if (t.isTypeAnnotation(annotation)) {
        switch (annotation.typeAnnotation.type) {
            case "ArrayTypeAnnotation":
            case "BooleanLiteralTypeAnnotation":
            case "BooleanTypeAnnotation":
            case "EmptyTypeAnnotation":
            case "FunctionTypeAnnotation":
            case "NumberLiteralTypeAnnotation":
            case "NumberTypeAnnotation":
            case "StringLiteralTypeAnnotation":
            case "StringTypeAnnotation":
            case "SymbolTypeAnnotation":
            case "ThisTypeAnnotation":
            case "TupleTypeAnnotation":
                return false
        }
        return true
    }
    return true
}

function isValidComponentParams(ctx: Context, fn: FunctionPath): boolean {
    const { t } = ctx
    const params = fn.node.params
    if (params.length === 0) {
        return true
    }
    if (params.length > 2) {
        return false
    }
    const first = params[0]
    if (!isValidPropsAnnotation(ctx, (first as t.Identifier).typeAnnotation)) {
        return false
    }
    if (params.length === 1) {
        return !t.isRestElement(first)
    }
    const second = params[1]
    return t.isIdentifier(second) && (second.name.includes("ref") || second.name.includes("Ref"))
}

function isNonNode(ctx: Context, node: t.Node | null | undefined): boolean {
    if (!node) {
        return true
    }
    switch (node.type) {
        case "ObjectExpression":
        case "ArrowFunctionExpression":
        case "FunctionExpression":
        case "BigIntLiteral":
        case "ClassExpression":
        case "NewExpression":
            return true
    }
    return false
}

function returnsNonNode(ctx: Context, fn: FunctionPath): boolean {
    const { t } = ctx
    let result = false
    if (fn.isArrowFunctionExpression() && !t.isBlockStatement(fn.node.body)) {
        result = isNonNode(ctx, fn.node.body)
    }
    const root = fn.node
    const skipNested = (p: NodePath) => {
        if (p.node !== root) {
            p.skip()
        }
    }
    fn.traverse({
        ReturnStatement(ret) {
            result = isNonNode(ctx, ret.node.argument)
        },
        ArrowFunctionExpression: skipNested,
        FunctionExpression: skipNested,
        FunctionDeclaration: skipNested,
        ObjectMethod(p) {
            p.skip()
        }
    })
    return result
}

type FunctionType = "component" | "hook"

function classifyCandidate(ctx: Context, candidate: Candidate): FunctionType | null {
    const { fn, name } = candidate
    if (name !== null && HOOK_NAME_RE.test(name)) {
        const scan = scanBody(ctx, fn)
        return scan.rootJsx || scan.rootHooks ? "hook" : null
    }
    if (name !== null && !COMPONENT_NAME_RE.test(name)) {
        return null
    }
    const scan = scanBody(ctx, fn)
    if (!(scan.deepJsx || scan.rootHooks)) {
        return null
    }
    if (!isValidComponentParams(ctx, fn) || returnsNonNode(ctx, fn)) {
        return null
    }
    return "component"
}

function getCompilerFunctionName(
    ctx: Context,
    fn: FunctionPath
): t.Identifier | t.MemberExpression | null {
    const { t } = ctx
    if (fn.isFunctionDeclaration()) {
        return fn.node.id ?? null
    }
    const parent = fn.parent
    let id: t.Node | null | undefined = null
    if (t.isVariableDeclarator(parent) && parent.init === fn.node) {
        id = parent.id
    } else if (
        t.isAssignmentExpression(parent) &&
        parent.right === fn.node &&
        parent.operator === "="
    ) {
        id = parent.left
    } else if (
        (t.isObjectProperty(parent) || t.isClassProperty(parent)) &&
        parent.value === fn.node &&
        !parent.computed
    ) {
        id = parent.key
    } else if (t.isAssignmentPattern(parent) && parent.right === fn.node) {
        id = parent.left
    }
    if (t.isIdentifier(id) || t.isMemberExpression(id)) {
        return id
    }
    return null
}

function isReactApiCallback(ctx: Context, fn: FunctionPath, api: "forwardRef" | "memo"): boolean {
    const { t } = ctx
    const parent = fn.parent
    if (!t.isCallExpression(parent)) {
        return false
    }
    const callee = parent.callee
    return (
        (t.isIdentifier(callee) && callee.name === api) ||
        (t.isMemberExpression(callee) &&
            !callee.computed &&
            t.isIdentifier(callee.object, { name: "React" }) &&
            t.isIdentifier(callee.property, { name: api }))
    )
}

function compilerFunctionType(ctx: Context, fn: FunctionPath): FunctionType | null {
    const { t } = ctx
    const nameNode = getCompilerFunctionName(ctx, fn)
    if (nameNode && t.isIdentifier(nameNode) && COMPONENT_NAME_RE.test(nameNode.name)) {
        const scan = scanBody(ctx, fn)
        return (scan.rootJsx || scan.rootHooks) &&
            isValidComponentParams(ctx, fn) &&
            !returnsNonNode(ctx, fn)
            ? "component"
            : null
    }
    if (nameNode && isHookNameNode(ctx, nameNode)) {
        const scan = scanBody(ctx, fn)
        return scan.rootJsx || scan.rootHooks ? "hook" : null
    }
    if (
        (fn.isFunctionExpression() || fn.isArrowFunctionExpression()) &&
        (isReactApiCallback(ctx, fn, "forwardRef") || isReactApiCallback(ctx, fn, "memo"))
    ) {
        const scan = scanBody(ctx, fn)
        return scan.rootJsx || scan.rootHooks ? "component" : null
    }
    return null
}

function functionDisplayName(ctx: Context, fn: FunctionPath): string | null {
    const { t } = ctx
    const nameNode = getCompilerFunctionName(ctx, fn)
    if (t.isIdentifier(nameNode)) {
        return nameNode.name
    }
    if (t.isMemberExpression(nameNode) && t.isIdentifier(nameNode.property)) {
        return nameNode.property.name
    }
    return null
}

function findDirective(ctx: Context, fn: FunctionPath, set: Set<string>): string | null {
    const body = fn.node.body
    if (!ctx.t.isBlockStatement(body)) {
        return null
    }
    const found = body.directives.find(d => set.has(d.value.value))
    return found ? found.value.value : null
}

function addNoMemoDirective(ctx: Context, fn: FunctionPath, name: string | null): void {
    const { t } = ctx
    const node = fn.node
    if (!t.isBlockStatement(node.body)) {
        node.body = t.blockStatement([t.returnStatement(node.body)])
        ctx.changed = true
    }
    const body = node.body
    if (body.directives.some(d => OPT_OUT_DIRECTIVES.has(d.value.value))) {
        return
    }
    body.directives.push(t.directive(t.directiveLiteral(NO_MEMO_DIRECTIVE)))
    ctx.result.directives.push(name ?? "<anonymous>")
    ctx.changed = true
}

function addDirectivesToRemainingFunctions(ctx: Context): void {
    ctx.program.traverse({
        Function(p) {
            if (
                !(
                    p.isFunctionDeclaration() ||
                    p.isFunctionExpression() ||
                    p.isArrowFunctionExpression()
                )
            ) {
                return
            }
            const fn = p as FunctionPath
            if (ctx.handled.has(fn.node)) {
                fn.skip()
                return
            }
            const type = compilerFunctionType(ctx, fn)
            if (type === null) {
                return
            }
            fn.skip()
            if (findDirective(ctx, fn, OPT_IN_DIRECTIVES) !== null) {
                return
            }
            if (type === "hook" && !ctx.opts.useNoMemoHooks) {
                return
            }
            addNoMemoDirective(ctx, fn, functionDisplayName(ctx, fn))
        },
        Class(p) {
            p.skip()
        }
    })
}

function describeCandidate(candidate: Candidate): string {
    return candidate.name ? `Component \`${candidate.name}\`` : "An anonymous component"
}

function processCandidate(ctx: Context, candidate: Candidate, addDirectives: boolean): void {
    const { fn, name } = candidate
    if (fn.node.async || fn.node.generator) {
        return
    }
    const type = classifyCandidate(ctx, candidate)
    if (type === null) {
        return
    }
    ctx.handled.add(fn.node)

    const observed =
        candidate.wrappers.some(w => w.kind === "observer") ||
        (candidate.binding !== null && name !== null && ctx.observedNames.has(name))

    const optIn = findDirective(ctx, fn, OPT_IN_DIRECTIVES)
    if (optIn !== null) {
        if (observed) {
            throw fn.buildCodeFrameError(
                `[mobx-react-plugin] ${describeCandidate(candidate)} is wrapped in \`observer\` ` +
                    `but also contains the "${optIn}" directive. React Compiler must not memoize observer ` +
                    `components (their output would go stale), so remove the directive or the observer.`
            )
        }
        return
    }

    if (type === "hook") {
        if (addDirectives && ctx.opts.useNoMemoHooks) {
            addNoMemoDirective(ctx, fn, name)
        }
        return
    }

    if (addDirectives) {
        addNoMemoDirective(ctx, fn, name)
    }
    if (observed) {
        redirectObservedSelfReferences(ctx, candidate)
        return
    }
    wrapComponent(ctx, candidate)
}

interface WrapPlan {
    target: "fn" | CallPath
    memoCall: CallPath | null
}

function resolveWrapPlan(wrappers: Wrapper[]): WrapPlan | null {
    if (wrappers.length === 0) {
        return { target: "fn", memoCall: null }
    }
    if (wrappers.length === 1 && wrappers[0].kind === "forwardRef") {
        return { target: wrappers[0].call, memoCall: null }
    }
    if (wrappers.length === 1 && wrappers[0].kind === "memo") {
        return { target: "fn", memoCall: wrappers[0].call }
    }
    if (wrappers.length === 2 && wrappers[0].kind === "memo" && wrappers[1].kind === "forwardRef") {
        return { target: wrappers[1].call, memoCall: wrappers[0].call }
    }
    return null
}

function canConvertArrow(ctx: Context, fn: NodePath<t.ArrowFunctionExpression>): boolean {
    let safe = true
    fn.traverse({
        ThisExpression() {
            safe = false
        },
        Super() {
            safe = false
        },
        MetaProperty() {
            safe = false
        },
        Identifier(p) {
            if (p.node.name === "arguments" && p.isReferencedIdentifier()) {
                safe = false
            }
        },
        FunctionExpression(p) {
            p.skip()
        },
        FunctionDeclaration(p) {
            p.skip()
        },
        ObjectMethod(p) {
            p.skip()
        },
        Class(p) {
            p.skip()
        }
    })
    void ctx
    return safe
}

function decideFunctionName(ctx: Context, candidate: Candidate): string | null {
    const { fn, name } = candidate
    if (fn.isFunctionDeclaration()) {
        return name
    }
    if (fn.isFunctionExpression()) {
        return fn.node.id ? fn.node.id.name : name
    }
    return name !== null && canConvertArrow(ctx, fn as NodePath<t.ArrowFunctionExpression>)
        ? name
        : null
}

function collectSelfReferences(ctx: Context, candidate: Candidate, fnName: string): NodePath[] {
    const refs: NodePath[] = []
    const { fn, binding, name } = candidate
    if (binding && name === fnName) {
        for (const ref of binding.referencePaths) {
            if (ref.isDescendant(fn)) {
                refs.push(ref)
            }
        }
    }
    if (binding && fn.isFunctionExpression() && fn.node.id && fn.node.id.name === fnName) {
        const local = fn.scope.getBinding(fnName)
        if (local && local.kind === "local") {
            refs.push(...local.referencePaths)
        }
    }
    return refs
}

function copyFunctionMeta(from: t.Function, to: t.FunctionExpression): void {
    const source = from as t.FunctionDeclaration
    if (source.typeParameters) {
        to.typeParameters = source.typeParameters
    }
    if (source.returnType) {
        to.returnType = source.returnType
    }
    if (source.loc) {
        to.loc = source.loc
    }
}

function buildFunctionExpression(
    ctx: Context,
    fn: t.FunctionDeclaration | t.ArrowFunctionExpression,
    name: string | null
): t.FunctionExpression {
    const { t } = ctx
    const body = t.isBlockStatement(fn.body)
        ? fn.body
        : t.blockStatement([t.returnStatement(fn.body)])
    const expr = t.functionExpression(
        name ? t.identifier(name) : null,
        fn.params,
        body,
        fn.generator,
        fn.async
    )
    copyFunctionMeta(fn, expr)
    return expr
}

function wrapComponent(ctx: Context, candidate: Candidate): void {
    const { t } = ctx
    const { fn, name, binding, site } = candidate

    if (name !== null && binding !== null && ctx.forwardRefNames.has(name)) {
        wrapForwardRefCallSites(ctx, name)
        return
    }

    const plan = resolveWrapPlan(candidate.wrappers)
    if (plan === null) {
        return
    }

    const fnName = decideFunctionName(ctx, candidate)
    const selfRefs = fnName !== null ? collectSelfReferences(ctx, candidate, fnName) : []
    const aliasId = selfRefs.length > 0 ? ctx.program.scope.generateUidIdentifier(fnName!) : null
    if (aliasId) {
        for (const ref of selfRefs) {
            ;(ref.node as t.Identifier | t.JSXIdentifier).name = aliasId.name
        }
    }
    const observer = () => t.identifier(ensureObserverImport(ctx))
    const constDecl = (id: string | t.Identifier, init: t.Expression) =>
        t.variableDeclaration("const", [
            t.variableDeclarator(typeof id === "string" ? t.identifier(id) : id, init)
        ])
    const aliasDecl = aliasId && name !== null ? constDecl(aliasId, t.identifier(name)) : null

    if (site.kind === "declaration") {
        const decl = fn as NodePath<t.FunctionDeclaration>
        const call = t.callExpression(observer(), [buildFunctionExpression(ctx, decl.node, fnName)])
        if (site.exportKind === "default") {
            const exportPath = decl.parentPath as NodePath<t.ExportDefaultDeclaration>
            const externalRefs = binding
                ? binding.referencePaths.filter(ref => ref !== exportPath && !ref.isDescendant(fn))
                : []
            const needsBinding =
                name !== null &&
                binding !== null &&
                (aliasDecl !== null ||
                    externalRefs.length > 0 ||
                    binding.constantViolations.length > 0)
            if (needsBinding) {
                exportPath.replaceWithMultiple([
                    constDecl(name!, call),
                    ...(aliasDecl ? [aliasDecl] : []),
                    t.exportDefaultDeclaration(t.identifier(name!))
                ])
            } else {
                exportPath.get("declaration").replaceWith(call)
            }
        } else {
            const varDecl = constDecl(name!, call)
            if (site.exportKind === "named") {
                decl.replaceWith(varDecl)
                if (aliasDecl) {
                    decl.parentPath.insertAfter(aliasDecl)
                }
            } else {
                decl.replaceWithMultiple(aliasDecl ? [varDecl, aliasDecl] : [varDecl])
            }
        }
    } else {
        let fnPath: NodePath<t.Expression> = fn as NodePath<t.Expression>
        if (fn.isArrowFunctionExpression() && fnName !== null) {
            ;[fnPath] = fn.replaceWith(buildFunctionExpression(ctx, fn.node, fnName))
        } else if (fn.isFunctionExpression() && !fn.node.id && fnName !== null) {
            fn.node.id = t.identifier(fnName)
        }
        const target = plan.target === "fn" ? fnPath : plan.target
        if (plan.memoCall && plan.memoCall.node.arguments.length === 1) {
            plan.memoCall.get("callee").replaceWith(observer())
        } else {
            target.replaceWith(t.callExpression(observer(), [target.node]))
        }
        if (aliasDecl && site.kind === "declarator") {
            let stmt: NodePath = site.declarator.parentPath
            if (stmt.parentPath && stmt.parentPath.isExportNamedDeclaration()) {
                stmt = stmt.parentPath
            }
            stmt.insertAfter(aliasDecl)
        }
    }

    ctx.result.wrapped.push(name ?? "<anonymous>")
    ctx.changed = true
}

function constDeclaration(
    t: Types,
    id: string | t.Identifier,
    init: t.Expression
): t.VariableDeclaration {
    return t.variableDeclaration("const", [
        t.variableDeclarator(typeof id === "string" ? t.identifier(id) : id, init)
    ])
}

function uniqueComponentName(ctx: Context, base: string): string {
    const scope = ctx.program.scope
    let name = base
    let i = 2
    while (scope.hasBinding(name) || scope.hasGlobal(name) || scope.hasReference(name)) {
        name = `${base}${i++}`
    }
    return name
}

function renameReferences(refs: NodePath[], name: string): void {
    for (const ref of refs) {
        ;(ref.node as t.Identifier | t.JSXIdentifier).name = name
    }
}

function redirectObservedSelfReferences(ctx: Context, candidate: Candidate): void {
    const { t } = ctx
    const { fn, name, binding, site } = candidate

    if (fn.isFunctionDeclaration()) {
        if (binding === null || name === null) {
            return
        }
        const selfRefs = binding.referencePaths.filter(ref => ref.isDescendant(fn))
        if (selfRefs.length === 0) {
            return
        }
        const observerCalls = binding.referencePaths.filter(ref => {
            const parent = ref.parentPath
            return (
                parent !== null &&
                parent.isCallExpression() &&
                parent.node.arguments[0] === ref.node &&
                getWrapperKind(ctx, parent.get("callee")) === "observer"
            )
        })
        if (observerCalls.length !== 1) {
            return
        }
        const call = observerCalls[0].parentPath as CallPath
        const owner = call.parentPath
        let observedName: string
        if (
            owner.isVariableDeclarator() &&
            owner.node.init === call.node &&
            t.isIdentifier(owner.node.id) &&
            owner.scope === ctx.program.scope
        ) {
            observedName = owner.node.id.name
        } else if (owner.isExportDefaultDeclaration() && owner.node.declaration === call.node) {
            observedName = uniqueComponentName(ctx, `${name}Observer`)
            owner.replaceWithMultiple([
                constDeclaration(t, observedName, call.node),
                t.exportDefaultDeclaration(t.identifier(observedName))
            ])
        } else {
            return
        }
        renameReferences(selfRefs, observedName)
        ctx.result.aliased.push(name)
        ctx.changed = true
        return
    }

    if (!fn.isFunctionExpression() || !fn.node.id) {
        return
    }
    const fnName = fn.node.id.name
    const local = fn.scope.getBinding(fnName)
    if (!local || local.kind !== "local" || local.referencePaths.length === 0) {
        return
    }
    if (site.kind === "declarator") {
        if (name === null) {
            return
        }
        const aliasId = ctx.program.scope.generateUidIdentifier(fnName)
        renameReferences(local.referencePaths, aliasId.name)
        let stmt: NodePath = site.declarator.parentPath
        if (stmt.parentPath && stmt.parentPath.isExportNamedDeclaration()) {
            stmt = stmt.parentPath
        }
        stmt.insertAfter(constDeclaration(t, aliasId, t.identifier(name)))
    } else if (site.kind === "default-expression") {
        if (ctx.program.scope.hasBinding(fnName) || ctx.program.scope.hasGlobal(fnName)) {
            return
        }
        const aliasId = ctx.program.scope.generateUidIdentifier(fnName)
        renameReferences(local.referencePaths, aliasId.name)
        const declaration = site.exportDecl.node.declaration as t.Expression
        site.exportDecl.replaceWithMultiple([
            constDeclaration(t, fnName, declaration),
            constDeclaration(t, aliasId, t.identifier(fnName)),
            t.exportDefaultDeclaration(t.identifier(fnName))
        ])
    } else {
        return
    }
    ctx.result.aliased.push(fnName)
    ctx.changed = true
}

function wrapForwardRefCallSites(ctx: Context, name: string): void {
    const { t } = ctx
    let wrapped = false
    for (const call of ctx.forwardRefCalls) {
        const arg = call.node.arguments[0]
        if (!t.isIdentifier(arg, { name })) {
            continue
        }
        const parent = call.parentPath
        if (parent.isCallExpression() && getWrapperKind(ctx, parent.get("callee")) === "observer") {
            continue
        }
        call.replaceWith(t.callExpression(t.identifier(ensureObserverImport(ctx)), [call.node]))
        wrapped = true
    }
    if (wrapped) {
        ctx.result.wrapped.push(name)
        ctx.changed = true
    }
}

function ensureObserverImport(ctx: Context): string {
    if (ctx.observerLocal === null) {
        ctx.observerLocal = addImport(ctx.t, ctx.program, OBSERVER_NAME, OBSERVER_SOURCE)
        ctx.changed = true
    }
    return ctx.observerLocal
}
