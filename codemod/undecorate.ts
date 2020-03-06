import { API, ImportSpecifier, FileInfo, Decorator, ASTPath } from "jscodeshift"

const validDecorators = ["action", "observable", "computed"]

export const parser = "babylon"

export default function tranform(fileInfo: FileInfo, api: API, options: any) {
    const j = api.jscodeshift
    const source = j(fileInfo.source)

    let changed = false
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

    source.find(j.ClassProperty).replaceWith(property => {
        // @ts-ignore
        const decorators: Decorator[] = property.value.decorators
        if (decorators.length === 0) {
            return property
        }
        if (decorators.length > 1) {
            console.warn("Found multiple decorators, skipping..")
        }
        const decorator = decorators[0]
        const expr = decorator.expression
        if (!j.Identifier.check(expr) || !decoratorsUsed.has(expr.name)) {
            warn(`Found unknown decorator `, property)
            return property
        }
        //@x = y
        if (!property.value.computed && !property.value.static) {
            changed = true
            // decorator.remove()

            // only identifier expression atm
            const wrappedExpression = j.Identifier.check(decorator.expression)
                ? j.callExpression(j.identifier(decorator.expression.name), [property.value.value])
                : null // TODO call expression, property access expression

            property.value.variance
            const res = j.classProperty(
                property.value.key,
                wrappedExpression,
                property.value.typeAnnotation,
                property.value.static
            )
            res.comments = property.value.comments
            return res
        }
        // if (decorator.parent)
        // fields
        // methods
        // getters
        return property
    })

    if (!decoratorsUsed.size) {
        return // no mobx in this file
    }

    if (changed) {
        return source.toSource()
    }

    function warn(msg, path: ASTPath<any>) {
        console.warn(
            `[mobx:undecorate] ${msg} ${fileInfo.path}@${path.value.loc.start.line}:${
                path.value.loc.start.column
            }`
        )
    }
}
