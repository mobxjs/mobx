import type { NodePath, types as t } from "@babel/core"

type Types = typeof t

export function findImport(
    t: Types,
    program: NodePath<t.Program>,
    name: string,
    sources: string[]
): string | null {
    for (const node of program.node.body) {
        if (
            !t.isImportDeclaration(node) ||
            node.importKind === "type" ||
            node.importKind === "typeof" ||
            !sources.includes(node.source.value)
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
            if (imported === name) {
                return spec.local.name
            }
        }
    }
    return null
}

export function addImport(
    t: Types,
    program: NodePath<t.Program>,
    name: string,
    source: string
): string {
    let lastImport: NodePath<t.ImportDeclaration> | null = null
    let sameSourceImport: NodePath<t.ImportDeclaration> | null = null
    for (const stmt of program.get("body")) {
        if (!stmt.isImportDeclaration()) {
            continue
        }
        lastImport = stmt
        const node = stmt.node
        if (
            sameSourceImport === null &&
            node.importKind !== "type" &&
            node.importKind !== "typeof" &&
            node.source.value === source &&
            !node.specifiers.some(spec => t.isImportNamespaceSpecifier(spec))
        ) {
            sameSourceImport = stmt
        }
    }

    const scope = program.scope
    const local =
        scope.hasBinding(name) || scope.hasGlobal(name) || scope.hasReference(name)
            ? scope.generateUidIdentifier(name).name
            : name

    if (program.node.sourceType === "module") {
        const specifier = t.importSpecifier(t.identifier(local), t.identifier(name))
        if (sameSourceImport) {
            sameSourceImport.node.specifiers.push(specifier)
        } else {
            const declaration = t.importDeclaration([specifier], t.stringLiteral(source))
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
                            t.identifier(name),
                            t.identifier(local),
                            false,
                            local === name
                        )
                    ]),
                    t.callExpression(t.identifier("require"), [t.stringLiteral(source)])
                )
            ])
        )
    }
    return local
}
