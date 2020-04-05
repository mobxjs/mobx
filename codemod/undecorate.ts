import {
    API,
    FileInfo,
    Decorator,
    ASTPath,
    ClassProperty,
    Node,
    ClassDeclaration,
    MethodDefinition,
    ClassMethod,
    CallExpression,
    Identifier,
    FunctionExpression,
    ArrowFunctionExpression,
    ObjectExpression
} from "jscodeshift"

const validDecorators = ["action", "observable", "computed"]

const babylon = require("@babel/parser")

const defaultOptions = {
    sourceType: "module",
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    startLine: 1,
    tokens: true,
    plugins: [
        // "estree",
        "asyncGenerators",
        "bigInt",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        ["decorators", { decoratorsBeforeExport: true }],
        "legacy-decorators",
        "doExpressions",
        "dynamicImport",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "functionBind",
        "functionSent",
        "importMeta",
        "logicalAssignment",
        "nullishCoalescingOperator",
        "numericSeparator",
        "objectRestSpread",
        "optionalCatchBinding",
        "optionalChaining",
        ["pipelineOperator", { proposal: "minimal" }],
        "throwExpressions",
        "typescript"
    ]
}

export const parser = {
    parse(code) {
        return babylon.parse(code, defaultOptions)
    }
}

export default function tranform(
    fileInfo: FileInfo,
    api: API,
    options?: { ignoreImports: boolean }
): any {
    const j = api.jscodeshift
    const superCall = j.expressionStatement(j.callExpression(j.super(), []))
    const source = j(fileInfo.source)
    const lines = fileInfo.source.split("\n")
    let changed = false
    let needsInitializeImport = false
    const decoratorsUsed = new Set<String>(options?.ignoreImports ? validDecorators : [])
    let usesDecorate = options?.ignoreImports ? true : false

    source.find(j.ImportDeclaration).forEach(im => {
        if (im.value.source.value === "mobx") {
            let decorateIndex = -1
            im.value.specifiers.forEach((specifier, idx) => {
                // imported decorator
                if (
                    j.ImportSpecifier.check(specifier) &&
                    validDecorators.includes(specifier.imported.name)
                ) {
                    decoratorsUsed.add(specifier.imported.name)
                }
                // imported decorate call
                if (j.ImportSpecifier.check(specifier) && specifier.imported.name === "decorate") {
                    usesDecorate = true
                    decorateIndex = idx
                }
            })
            if (decorateIndex !== -1) {
                im.value.specifiers.splice(decorateIndex, 1)
            }
        }
    })

    // rewrite all decorate calls to class decorators
    if (usesDecorate) {
        source
            .find(j.CallExpression)
            .filter(
                callPath =>
                    j.Identifier.check(callPath.value.callee) &&
                    callPath.value.callee.name === "decorate"
            )
            .forEach(callPath => {
                let canRemoveDecorateCall = true
                if (callPath.value.arguments.length !== 2) {
                    warn("Expected a decorate call with two arguments", callPath.value)
                    return
                }
                const target = callPath.value.arguments[0]
                const decorators = callPath.value.arguments[1]

                if (!j.Identifier.check(target)) {
                    // not targetting a class, just swap it with makeObservable
                    changed = true
                    // @ts-ignore
                    callPath.value.callee.name = "observable"
                    return
                }
                const declarations = callPath.scope.getBindings()[target.name]
                if (declarations.length === 0) {
                    warn(
                        `Expected exactly one class declaration for '${target.name}' but found ${declarations.length}`,
                        target
                    )
                    return
                }
                const targetDeclaration = declarations[0].parentPath.value
                if (!j.ClassDeclaration.check(targetDeclaration)) {
                    // not targetting a class, just swap it with makeObservable
                    changed = true
                    // @ts-ignore
                    callPath.value.callee.name = "observable"
                    return
                }
                const clazz: ClassDeclaration = targetDeclaration
                // @ts-ignore
                createConstructor(clazz, decorators)

                // Remove the callPath (and wrapping expressionStatement)
                if (canRemoveDecorateCall) {
                    callPath.parent.prune()
                }
                changed = true
            })
    }

    // rewrite all class decorators
    source.find(j.ClassDeclaration).forEach(clazzPath => {
        const clazz = clazzPath.value
        const effects = {
            membersMap: [] as any
        }

        clazz.body.body = clazz.body.body.map(prop => {
            if (j.ClassProperty.check(prop) || j.ClassMethod.check(prop)) {
                return handleProperty(prop as any, effects, clazzPath)
            }
            return prop
        })

        if (effects.membersMap.length) {
            changed = true
            const members = j.objectExpression(
                effects.membersMap.map(([key, value, computed]) => {
                    // loose the comments, as they are already in the field definition
                    const { comments, ...k } = key
                    const { comments: comments2, ...v } = value
                    const prop = j.objectProperty(k, v)
                    prop.computed = !!computed
                    return prop
                })
            )
            createConstructor(clazz, members)
            needsInitializeImport = true
        }
    })
    if (needsInitializeImport) {
        // @ts-ignore
        const mobxImport = source
            .find(j.ImportDeclaration)
            .filter(im => im.value.source.value === "mobx")
            .nodes()[0]
        if (!mobxImport) {
            console.warn(
                "Failed to find mobx import, can't add makeObservable as dependency in " +
                    fileInfo.path
            )
        } else {
            if (!mobxImport.specifiers) {
                mobxImport.specifiers = []
            }
            mobxImport.specifiers.push(j.importSpecifier(j.identifier("makeObservable")))
        }
    }
    if (!decoratorsUsed.size && !usesDecorate) {
        return // no mobx in this file
    }
    if (changed) {
        return source.toSource()
    }

    function handleProperty(
        property: ClassProperty /* | or ClassMethod */ & { decorators: Decorator[] },
        effects: {
            membersMap: [[any, any, boolean]]
        },
        clazzPath: ASTPath<ClassDeclaration>
    ): ClassProperty | ClassMethod {
        const decorators = property.decorators
        if (!decorators || decorators.length === 0) {
            return property
        }
        if (decorators.length > 1) {
            warn("Found multiple decorators, skipping..", property.decorators[0])
            return property
        }
        const decorator = decorators[0]
        if (!j.Decorator.check(decorator)) {
            return property
        }
        const expr = decorator.expression
        if (j.Identifier.check(expr) && !decoratorsUsed.has(expr.name)) {
            warn(`Found non-mobx decorator @${expr.name}`, decorator)
            return property
        }
        if (property.static) {
            warn(`Static properties are not supported ${property.key.loc?.source}`, property)
            return property
        }

        property.decorators.splice(0)

        effects.membersMap.push([property.key, expr, property.computed])
        return property
    }

    function createConstructor(clazz: ClassDeclaration, members: ObjectExpression) {
        // makeObservable(this, { members })
        const initializeObservablesCall = j.expressionStatement(
            j.callExpression(j.identifier("makeObservable"), [j.thisExpression(), members])
        )

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

    function warn(msg: string, node: Node) {
        const line = lines[node.loc!.start.line - 1]
        const shortline = line.replace(/^\s*/, "")
        console.warn(
            `[mobx:undecorate] ${msg} at (${fileInfo.path}:${node.loc!.start.line}:${
                node.loc!.start.column
            }):\n\t${shortline}\n\t${"^".padStart(
                node.loc!.start.column + 1 - line.indexOf(shortline),
                " "
            )}\n`
        )
    }
}
