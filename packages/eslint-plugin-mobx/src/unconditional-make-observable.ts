"use strict"

import { findAncestor } from "./utils"

function create(context) {
    return {
        "CallExpression[callee.name=/(makeObservable|makeAutoObservable)/]": makeObservable => {
            // Only iterested about makeObservable(this, ...) inside constructor and not inside nested bindable function
            const [firstArg] = makeObservable.arguments
            if (!firstArg) return
            if (firstArg.type !== "ThisExpression") return
            //     MethodDefinition[key.name="constructor"][kind="constructor"]
            //       FunctionExpression
            //         BlockStatement
            //           ExpressionStatement
            //             CallExpression[callee.name="makeObservable"]
            const closestFunction = findAncestor(
                makeObservable,
                node => node.type === "FunctionExpression" || node.type === "FunctionDeclaration"
            )
            if (closestFunction?.parent?.kind !== "constructor") return
            if (makeObservable.parent.parent.parent !== closestFunction) {
                context.report({
                    node: makeObservable,
                    messageId: "mustCallUnconditionally",
                    data: {
                        name: makeObservable.callee.name
                    }
                })
            }
        }
    }
}

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "disallows calling `makeObservable(this)` conditionally inside constructors",
            recommended: true
        },
        messages: {
            mustCallUnconditionally:
                "`{{ name }}` must be called unconditionally inside constructor."
        }
    },
    create
}
