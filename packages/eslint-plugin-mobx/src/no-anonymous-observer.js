"use strict"

function create(context) {
    const sourceCode = context.getSourceCode()

    return {
        'CallExpression[callee.name="observer"]': observer => {
            const cmp = observer.arguments[0]
            if (!cmp) return
            if (cmp?.id?.name) return

            const fix = fixer => {
                // Use name from variable for autofix
                const name =
                    observer.parent?.type === "VariableDeclarator"
                        ? observer.parent.id.name
                        : undefined

                if (!name) return
                if (cmp.type === "ArrowFunctionExpression") {
                    const arrowToken = sourceCode.getTokenBefore(cmp.body)
                    const fixes = [
                        fixer.replaceText(arrowToken, ""),
                        fixer.insertTextBefore(cmp, `function ${name}`)
                    ]
                    if (cmp.body.type !== "BlockStatement") {
                        fixes.push(
                            fixer.insertTextBefore(cmp.body, `{ return `),
                            fixer.insertTextAfter(cmp.body, ` }`)
                        )
                    }
                    return fixes
                }
                if (cmp.type === "FunctionExpression") {
                    const functionToken = sourceCode.getFirstToken(cmp)
                    return fixer.replaceText(functionToken, `function ${name}`)
                }
                if (cmp.type === "ClassExpression") {
                    const classToken = sourceCode.getFirstToken(cmp)
                    return fixer.replaceText(classToken, `class ${name}`)
                }
            }
            context.report({
                node: cmp,
                messageId: "observerComponentMustHaveName",
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
            description: "forbids anonymous functions or classes as `observer` components",
            recommended: true
        },
        messages: {
            observerComponentMustHaveName: "`observer` component must have a name."
        }
    },
    create
}
