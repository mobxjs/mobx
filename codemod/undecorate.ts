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
    ClassMethod
} from "jscodeshift"

const validDecorators = ["action", "observable", "computed"]

export const parser = "babylon"

export default function tranform(fileInfo: FileInfo, api: API, options: any) {
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
        let needsConstructor = false

        clazz.body.body.forEach(prop => {
            if (j.ClassProperty.check(prop)) {
                needsConstructor = needsConstructor || handleProperty(prop as any)
            }
        })

        if (needsConstructor) {
            createConstructor(clazz)
            needsInitializeImport = true
        }
    })

    if (needsInitializeImport) {
        // TODO: create import for initializeObservables
    }

    function handleProperty(property: ClassProperty & { decorators: Decorator[] }): boolean {
        const decorators = property.decorators
        if (decorators.length === 0) {
            return false
        }
        if (decorators.length > 1) {
            console.warn("Found multiple decorators, skipping..")
        }
        const decorator = decorators[0]
        const expr = decorator.expression
        if (!j.Identifier.check(expr) || !decoratorsUsed.has(expr.name)) {
            warn(`Found unknown decorator `, property)
            return false
        }
        //@x = y
        if (!property.computed && !property.static) {
            changed = true
            // decorator.remove()

            // only identifier expression atm
            const wrappedExpression = j.Identifier.check(decorator.expression)
                ? j.callExpression(j.identifier(decorator.expression.name), [property.value])
                : null // TODO call expression, property access expression

            property.decorators.splice(0)
            property.value = wrappedExpression
            return true
        }
        // if (decorator.parent)
        // fields
        // methods (note that super method wrapping doesn't need an initializeObservables!)
        // getters
        return false
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
                    "Generated new constructor for class. But since the class does have a base class, it might be needed to revisit the arguments that are passed to `super()`",
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

    if (!decoratorsUsed.size) {
        return // no mobx in this file
    }

    // TODO: update import statement

    if (changed) {
        return source.toSource()
    }

    function warn(msg, node: Node) {
        console.warn(
            `[mobx:undecorate] ${msg} ${fileInfo.path}@${node.loc.start.line}:${
                node.loc.start.column
            }`
        )
    }
}
