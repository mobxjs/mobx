'use strict';

const { findAncestor } = require('./utils.js');

const rule = {
  create(context) {
    return {
      'CallExpression[callee.name=/(makeObservable|makeAutoObservable)/]': makeObservable => {
        // Only iterested about makeObservable(this, ...) inside constructor and not inside nested bindable function
        const [firstArg] = makeObservable.arguments;
        if (!firstArg) return;
        if (firstArg.type !== 'ThisExpression') return;
        //     MethodDefinition[key.name="constructor"][kind="constructor"]
        //       FunctionExpression
        //         BlockStatement
        //           ExpressionStatement
        //             CallExpression[callee.name="makeObservable"]
        const closestFunction = findAncestor(makeObservable, node => node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration');
        if (closestFunction?.parent?.kind !== 'constructor') return;
        if (makeObservable.parent.parent.parent !== closestFunction) {
          context.report({
            node: makeObservable,
            message: '`{{ name }}` must be called unconditionally inside constructor.',
            data: {
              name: makeObservable.callee.name,
            }
          });
        }
      },
    };
  }
}

module.exports = rule;