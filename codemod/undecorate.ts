import {
    API,
    ImportSpecifier,
    FileInfo,
    Decorator,
    ASTPath,
    ClassProperty,
    Node,
    ClassDeclaration,
    MethodDefinition,
    ClassMethod,
    ImportDeclaration,
    CallExpression,
    MemberExpression,
    Identifier,
    FunctionExpression,
    ArrowFunctionExpression
} from "jscodeshift"

const validDecorators = ["action", "observable", "computed"]

export const parser = "babylon"

export default function tranform(fileInfo: FileInfo, api: API, options: any): any {
    const j = api.jscodeshift
    const superCall = j.expressionStatement(j.callExpression(j.super(), []))
    const initializeObservablesCall = j.expressionStatement(
        j.callExpression(j.identifier("initializeObservables"), [j.thisExpression()])
    )
    const source = j(fileInfo.source)
    let changed = false
    let needsInitializeImport = false
    const decoratorsUsed = new Set<String>()

    source.find(j.ImportDeclaration).forEach(im => {
        if (im.value.source.value === "mobx") {
            im.value.specifiers.forEach(specifier => {
                if (
                    j.ImportSpecifier.check(specifier) &&
                    validDecorators.includes(specifier.imported.name)
                ) {
                    decoratorsUsed.add(specifier.imported.name)
                }
            })
        }
    })
    source.find(j.ClassDeclaration).forEach(clazzPath => {
        const clazz = clazzPath.value
        const effects = {
            needsConstructor: false
        }

        clazz.body.body = clazz.body.body
            .map(prop => {
                if (j.ClassProperty.check(prop) || j.ClassMethod.check(prop)) {
                    return handleProperty(prop as any, effects, clazzPath)
                }
                return prop
            })
            .filter(Boolean) as any

        if (effects.needsConstructor) {
            createConstructor(clazz)
            needsInitializeImport = true
        }
    })
    if (needsInitializeImport) {
        // @ts-ignore
        const mobxImport = source
            .find(j.ImportDeclaration)
            .filter(im => im.value.source.value === "mobx")
            .nodes()[0]
        if (!mobxImport.specifiers) {
            mobxImport.specifiers = []
        }
        mobxImport.specifiers.push(j.importSpecifier(j.identifier("initializeObservables")))
    }
    if (!decoratorsUsed.size) {
        return // no mobx in this file
    }
    if (changed) {
        return source.toSource()
    }

    function handleProperty(
        property: ClassProperty /* | or ClassMethod */ & { decorators: Decorator[] },
        effects: {
            needsConstructor: boolean
        },
        clazzPath: ASTPath<ClassDeclaration>
    ): ClassProperty | ClassMethod {
        const decorators = property.decorators
        if (decorators.length === 0) {
            return property
        }
        if (decorators.length > 1) {
            warn("Found multiple decorators, skipping..", property)
            return property
        }
        const decorator = decorators[0]
        if (!j.Decorator.check(decorator)) {
            return property
        }
        const expr = decorator.expression
        if (j.Identifier.check(expr) && !decoratorsUsed.has(expr.name)) {
            warn(`Found non-mobx decorator @${expr.name}`, property)
            return property
        }
        if (property.static) {
            warn(`Static properties are not supported ${property.key.loc?.source}`, property)
            return property
        }

        const propInfo = parseProperty(property)
        // console.dir(propInfo)
        property.decorators.splice(0)

        // ACTIONS
        if (propInfo.baseDecorator === "action") {
            changed = true
            // those return false, since for actions we don't need to run initializeObservables again
            switch (true) {
                //@action.bound("x") = y
                //@action.bound = y
                case propInfo.type === "field" && propInfo.subDecorator === "bound": {
                    const arrowFn = toArrowFn(property.value as any)
                    property.value = fnCall(
                        // special case: if it was a generator function, it will still be a function expression, so still requires bound
                        ["action", j.FunctionExpression.check(arrowFn) && "bound"],
                        [propInfo.callArg, arrowFn]
                    )
                    return property
                }
                //@action.bound("x") m()
                //@action.bound m()
                case propInfo.type === "method" && propInfo.subDecorator === "bound": {
                    const arrowFn = toArrowFn(propInfo.expr as any)
                    return j.classProperty(
                        property.key,
                        fnCall(
                            // special case: if it was a generator function, it will still be a function expression, so still requires bound
                            ["action", j.FunctionExpression.check(arrowFn) && "bound"],
                            [propInfo.callArg, arrowFn]
                        )
                    )
                }
                //@action("x") = y
                //@action x = y
                case propInfo.type === "field" && !propInfo.subDecorator:
                    property.value = fnCall(["action"], [propInfo.callArg, property.value])
                    return property
                // //@action("x") m()
                // //@action m()
                case propInfo.type === "method": {
                    generateActionInitializationOnPrototype(clazzPath, property, propInfo)
                    return property
                }
                default:
                    warn("Uknown case for undecorate action ", property)
                    return property
            }
        }

        //@observable f = y
        //@observable.x f = y
        //@observable ['x'] = y
        // if (!property.computed) {
        //     changed = true
        //     // decorator.remove()

        //     // only identifier expression atm
        //     const wrappedExpression = j.Identifier.check(decorator.expression)
        //         ? j.callExpression(j.identifier(decorator.expression.name), [
        //               (property as any).value!
        //           ])
        //         : null // TODO call expression, property access expression

        //     property.decorators.splice(0)
        //     property.value = wrappedExpression
        //     effects.needsConstructor = true
        //     return property
        // }

        //@computed get m() // rewrite to this!
        //@computed get m() set m()
        //@computed(options) get m()
        //@computed(options) get m() set m()
        //@computed.struct get m()
        //@computed.struct get m() set m()
        return property
    }

    function generateActionInitializationOnPrototype(
        clazzPath: ASTPath<ClassDeclaration>,
        property: ClassProperty,
        propInfo: ReturnType<typeof parseProperty>
    ) {
        // N.B. this is not a transformation that one would write manually,
        // e.g. m = action(fn) would be way more straight forward,
        // but this transformation better preserves the old semantics, like sharing the action
        // on the prototype, which saves a lot of memory allocations, which some existing apps
        // might depend upon
        const clazzId = clazzPath.value.id
        const isComputedName = !j.Identifier.check(property.key)
        if (!clazzId) {
            warn(`Cannot transform action of anonymous class`, property)
        } else {
            // Bla.prototype.x = action(Bla.prototype.x)
            clazzPath.insertAfter(
                j.expressionStatement(
                    j.assignmentExpression(
                        "=",
                        j.memberExpression(
                            j.memberExpression(clazzId, j.identifier("prototype")),
                            property.key,
                            isComputedName
                        ),
                        fnCall(
                            ["action"],
                            [
                                propInfo.callArg,
                                j.memberExpression(
                                    j.memberExpression(clazzId, j.identifier("prototype")),
                                    property.key,
                                    isComputedName
                                )
                            ]
                        )
                    )
                )
            )
        }
    }

    function parseProperty(
        p: (ClassProperty | MethodDefinition) & { decorators: Decorator[] }
    ): {
        isCallExpression: boolean // TODO: not used?
        baseDecorator: "action" | "observable" | "computed"
        subDecorator: string
        type: "field" | "method" | "getter"
        expr: any
        callArg: any
        setterExpr: any
    } {
        const decExpr = p.decorators[0].expression
        const isCallExpression = j.CallExpression.check(decExpr)
        let baseDecorator = ""
        let subDecorator = ""
        let callArg: any
        // console.dir(decExpr)
        if (isCallExpression && j.MemberExpression.check((decExpr as CallExpression).callee)) {
            const me = (decExpr as CallExpression).callee
            if (
                j.MemberExpression.check(me) &&
                j.Identifier.check(me.object) &&
                j.Identifier.check(me.property)
            ) {
                baseDecorator = me.object.name
                subDecorator = me.property.name
            } else {
                warn(`Decorator expression too complex, please convert manually`, decExpr)
            }
        } else if (isCallExpression && j.Identifier.check((decExpr as CallExpression).callee)) {
            baseDecorator = ((decExpr as CallExpression).callee as Identifier).name
        } else if (
            j.MemberExpression.check(decExpr) &&
            j.Identifier.check(decExpr.object) &&
            j.Identifier.check(decExpr.property)
        ) {
            baseDecorator = decExpr.object.name
            subDecorator = decExpr.property.name
        } else if (j.Identifier.check(decExpr)) {
            baseDecorator = decExpr.name
        } else {
            warn(`Decorator expression too complex, please convert manually`, decExpr)
        }

        if (isCallExpression && (decExpr as CallExpression).arguments.length !== 1) {
            warn(`Expected exactly one argument`, decExpr)
        }
        callArg = isCallExpression && (decExpr as CallExpression).arguments[0]

        return {
            isCallExpression,
            baseDecorator: baseDecorator as any,
            subDecorator,
            type: j.ClassMethod.check(p) ? (p.kind === "get" ? "getter" : "method") : "field",
            expr: j.ClassMethod.check(p) ? p : p.value,
            callArg,
            setterExpr: undefined
        }
    }

    function createConstructor(clazz: ClassDeclaration) {
        const needsSuper = !!clazz.superClass
        let constructorIndex = clazz.body.body.findIndex(
            member => j.ClassMethod.check(member) && member.kind === "constructor"
        )
        // create a constructor
        if (constructorIndex === -1) {
            if (needsSuper) {
                warn(
                    `Generated new constructor for class ${clazz.id?.name}. But since the class does have a base class, it might be needed to revisit the arguments that are passed to \`super()\``,
                    clazz
                )
            }
            const constructorDecl = j.methodDefinition(
                "constructor",
                j.identifier("constructor"),
                j.functionExpression(
                    null,
                    [],
                    j.blockStatement(
                        needsSuper
                            ? [superCall, initializeObservablesCall]
                            : [initializeObservablesCall]
                    )
                )
            )

            const firstMethodIndex = clazz.body.body.findIndex(member =>
                j.ClassMethod.check(member)
            )
            if (firstMethodIndex === -1) {
                clazz.body.body.push(constructorDecl)
            } else {
                clazz.body.body.splice(firstMethodIndex, 0, constructorDecl)
            }
        } else {
            const c: ClassMethod = clazz.body.body[constructorIndex] as any
            j.ClassMethod.assert(c)
            const firstStatement = c.body.body[0]
            const hasSuper =
                firstStatement &&
                j.ExpressionStatement.check(firstStatement) &&
                j.CallExpression.check(firstStatement.expression) &&
                j.Super.check(firstStatement.expression.callee)
            c.body.body.splice(hasSuper ? 1 : 0, 0, initializeObservablesCall)
        }
    }

    function fnCall(name: [string] | [string, string | false], args: any[]) {
        return j.callExpression(
            name.filter(Boolean).length === 2
                ? j.memberExpression(j.identifier(name[0]), j.identifier(name[1] as any))
                : j.identifier(name[0]),
            args.filter(Boolean)
        )
    }

    function toArrowFn(m: ClassMethod): FunctionExpression | ArrowFunctionExpression {
        if (j.ArrowFunctionExpression.check(m) || !j.ClassMethod.check(m)) {
            // leave arrow funcs (and everything not a method at all) alone
            return m
        }
        const res = m.generator
            ? j.functionExpression(null, m.params, m.body, true)
            : j.arrowFunctionExpression(m.params, m.body)
        res.returnType = m.returnType
        res.comments = m.comments
        res.async = m.async
        return res
    }

    function warn(msg: string, node: Node) {
        console.warn(
            `[mobx:undecorate] ${msg} \n\tat (${fileInfo.path}:${node.loc!.start.line}:${
                node.loc!.start.column
            })`
        )
    }
}
