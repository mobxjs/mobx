"use strict"

function create(context) {
    const sourceCode = context.getSourceCode()

    return {
        "FunctionDeclaration,FunctionExpression,ArrowFunctionExpression,ClassDeclaration,ClassExpression":
            cmp => {
                if (
                    cmp.parent &&
                    cmp.parent.type === "CallExpression" &&
                    cmp.parent.callee.name === "observer"
                ) {
                    // observer(...)
                    return
                }
                let forwardRef =
                    cmp.parent &&
                    cmp.parent.type === "CallExpression" &&
                    cmp.parent.callee.name === "forwardRef"
                        ? cmp.parent
                        : undefined
                if (
                    forwardRef &&
                    forwardRef.parent &&
                    forwardRef.parent.type === "CallExpression" &&
                    forwardRef.parent.callee.name === "observer"
                ) {
                    // forwardRef(observer(...))
                    return
                }

                const cmpOrForwardRef = forwardRef || cmp
                let name = cmp.id?.name
                // If anonymous try to infer name from variable declaration
                if (!name && cmpOrForwardRef.parent?.type === "VariableDeclarator") {
                    name = cmpOrForwardRef.parent.id.name
                }
                if (cmp.type.startsWith("Class")) {
                    // Must extend Component or React.Component
                    const { superClass } = cmp
                    if (!superClass) {
                        // not a component
                        return
                    }
                    const superClassText = sourceCode.getText(superClass)
                    if (superClassText !== "Component" && superClassText !== "React.Component") {
                        // not a component
                        return
                    }
                } else {
                    // Name must start with uppercase letter
                    if (!name?.charAt(0).match(/^[A-Z]$/)) {
                        // not a component
                        return
                    }
                }

                const fix = fixer => {
                    return [
                        fixer.insertTextBefore(
                            sourceCode.getFirstToken(cmpOrForwardRef),
                            (name && cmp.type.endsWith("Declaration") ? `const ${name} = ` : "") +
                                "observer("
                        ),
                        fixer.insertTextAfter(sourceCode.getLastToken(cmpOrForwardRef), ")")
                    ]
                }
                context.report({
                    node: cmp,
                    messageId: "missingObserver",
                    data: {
                        name: name || "<anonymous>"
                    },
                    fix
                })
            }
    }
}

module.exports = {
    meta: {
        type: "problem",
        fixable: "code",
        docs: {
            description: "prevents missing `observer` on react component",
            recommended: true
        },
        messages: {
            missingObserver: "Component `{{ name }}` is missing `observer`."
        }
    },
    create
}
