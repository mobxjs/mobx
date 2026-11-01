import type { Rule } from "eslint"

import { findAncestor, isMobxDecorator } from "./utils"

// TODO support this.foo = 5; in constructor
// TODO? report on field as well
function create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const autofixAnnotation = context.options[0]?.autofixAnnotation ?? true

    function fieldToKey(field) {
        // TODO cache on field?
        const key = sourceCode.getText(field.key)
        return field.computed ? `[${key}]` : key
    }

    return {
        'CallExpression[callee.name="makeObservable"]': makeObservable => {
            // Only interested about makeObservable(this, ...) in constructor or makeObservable({}, ...)
            // ClassDeclaration
            //   ClassBody
            //     MethodDefinition[kind="constructor"]
            //       FunctionExpression
            //         BlockStatement
            //           ExpressionStatement
            //             CallExpression[callee.name="makeObservable"]
            const [firstArg, secondArg] = makeObservable.arguments
            if (!firstArg) return
            let members
            if (firstArg.type === "ThisExpression") {
                const closestFunction = findAncestor(
                    makeObservable,
                    node =>
                        node.type === "FunctionExpression" || node.type === "FunctionDeclaration"
                )
                if (closestFunction?.parent?.kind !== "constructor") return
                members = closestFunction.parent.parent.parent.body.body
            } else if (firstArg.type === "ObjectExpression") {
                members = firstArg.properties
            } else {
                return
            }

            const annotationProps = secondArg?.properties || []
            const nonAnnotatedMembers: any[] = []
            members.forEach(member => {
                if (member.static) return
                if (member.kind === "constructor") return
                if (member.decorators?.some(isMobxDecorator)) return
                if (!annotationProps.some(prop => fieldToKey(prop) === fieldToKey(member))) {
                    nonAnnotatedMembers.push(member)
                }
            })

            if (!secondArg && !nonAnnotatedMembers.length) {
                context.report({ node: makeObservable, messageId: "missingAnnotationsArg" })
            } else if (nonAnnotatedMembers.length) {
                // Set avoids reporting twice for setter+getter pair or actual duplicates
                const keys = [...new Set(nonAnnotatedMembers.map(fieldToKey))]
                const keyList = keys.map(key => `\`${key}\``).join(", ")

                const fix = fixer => {
                    const annotationList =
                        keys.map(key => `${key}: ${autofixAnnotation}`).join(", ") + ","
                    if (!secondArg) {
                        return fixer.insertTextAfter(firstArg, `, { ${annotationList} }`)
                    } else if (secondArg.type !== "ObjectExpression") {
                        return fixer.replaceText(secondArg, `{ ${annotationList} }`)
                    } else {
                        const openingBracket = sourceCode.getFirstToken(secondArg)
                        return fixer.insertTextAfter(openingBracket, ` ${annotationList} `)
                    }
                }

                context.report({
                    node: makeObservable,
                    messageId: "missingAnnotation",
                    data: { keyList },
                    fix
                })
            }
        }
    }
}

const rule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        fixable: "code",
        schema: [
            {
                type: "object",
                properties: {
                    autofixAnnotation: {
                        type: "boolean"
                    }
                },
                additionalProperties: false
            }
        ],
        docs: {
            description: "enforce all fields being listen in `makeObservable`",
            recommended: true
        },
        messages: {
            missingAnnotation:
                "Missing annotation for {{ keyList }}. To exclude a field, use `false` as annotation.",
            missingAnnotationsArg:
                "`makeObservable` requires annotations. Decorated members don't need it, so the call can be removed."
        }
    },
    create
}

export default rule
