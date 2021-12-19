'use strict';

const { findAncestor, isMobxDecorator } = require('./utils.js');

function create(context) {
  const sourceCode = context.getSourceCode();

  return {
    'Decorator': decorator => {
      if (!isMobxDecorator(decorator)) return;
      const clazz = findAncestor(decorator, node => node.type === 'ClassDeclaration' || node.type === 'ClassExpression');
      if (!clazz) return;
      // ClassDeclaration > ClassBody > []
      const constructor = clazz.body.body.find(node => node.kind === 'constructor' && node.value.type === 'FunctionExpression') ??
        clazz.body.body.find(node => node.kind === 'constructor');
      // MethodDefinition > FunctionExpression > BlockStatement > []
      const isMakeObservable = node => node.expression?.callee?.name === 'makeObservable' && node.expression?.arguments[0]?.type === 'ThisExpression';
      const makeObservable = constructor?.value.body?.body.find(isMakeObservable)?.expression;

      if (makeObservable) {
        // make sure second arg is nullish
        const secondArg = makeObservable.arguments[1];
        if (secondArg && secondArg.value !== null && secondArg.name !== 'undefined') {
          context.report({
            node: makeObservable,
            messageId: 'secondArgMustBeNullish',
          })
        }
      } else {
        const fix = fixer => {
          if (constructor?.value.type === 'TSEmptyBodyFunctionExpression') {
            // constructor() - yes this a thing
            const closingBracket = sourceCode.getLastToken(constructor.value);
            return fixer.insertTextAfter(closingBracket, ' { makeObservable(this); }')
          } else if (constructor) {
            // constructor() {}
            const closingBracket = sourceCode.getLastToken(constructor.value.body);
            return fixer.insertTextBefore(closingBracket, ';makeObservable(this);')
          } else {
            // class C {}
            const openingBracket = sourceCode.getFirstToken(clazz.body);
            return fixer.insertTextAfter(openingBracket, '\nconstructor() { makeObservable(this); }')
          }
        };

        context.report({
          node: clazz,
          messageId: 'missingMakeObservable',
          fix,
        })
      }
    },
  };
}

module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'prevents missing `makeObservable(this)` when using decorators',
      recommended: true,
      suggestion: false,
    },
    messages: {
      missingMakeObservable: "Constructor is missing `makeObservable(this)`.",
      secondArgMustBeNullish: "`makeObservable`'s second argument must be nullish or not provided when using decorators."
    },
  },
  create,
};