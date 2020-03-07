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
    ImportDeclaration
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

    function handleProperty(property: ClassProperty & { decorators: Decorator[] }): boolean {
        const decorators = property.decorators
        if (decorators.length === 0) {
            return false
        }
        if (decorators.length > 1) {
            console.warn("Found multiple decorators, skipping..")
            return false
        }
        const decorator = decorators[0]
        if (!j.Decorator.check(decorator)) {
            return false
        }
        const expr = decorator.expression
        if (j.Identifier.check(expr) && !decoratorsUsed.has(expr.name)) {
            warn(`Found non-mobx decorator @${expr.name}`, property)
            return false
        }
        if (property.static) {
            warn(`Static properties are not supported ${property.key.loc?.source}`, property)
            return false
        }

        //@action m()
        //@action("x") m()
        //@action.bound("x") m()
        //@action x = y
        //@action("x") = y
        //@action.bound("x") = y
        // methods (note that super method wrapping doesn't need an initializeObservables!)

        //@observable f = y
        //@observable.x f = y
        if (!property.computed) {
            changed = true
            // decorator.remove()

            // only identifier expression atm
            const wrappedExpression = j.Identifier.check(decorator.expression)
                ? j.callExpression(j.identifier(decorator.expression.name), [property.value!])
                : null // TODO call expression, property access expression

            property.decorators.splice(0)
            property.value = wrappedExpression
            return true
        }

        //@computed get m()
        //@computed get m() set m()
        //@computed(options) get m()
        //@computed(options) get m() set m()
        //@computed.struct get m()
        //@computed.struct get m() set m()
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

    function warn(msg, node: Node) {
        console.warn(
            `[mobx:undecorate] ${msg} \n\tat (${fileInfo.path}:${node.loc!.start.line}:${
                node.loc!.start.column
            })`
        )
    }
}
