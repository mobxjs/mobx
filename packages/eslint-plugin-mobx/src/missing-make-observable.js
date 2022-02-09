'use strict';

const {findAncestor, isMobxDecorator} = require('./utils.js');

function create(context) {
  const sourceCode = context.getSourceCode();

  let namespaceImportName = undefined; // is 'mobxFoo' when import * as mobxFoo from 'mobx'
  let makeObserverImportName = undefined; // is 'mobxFoo' when import * as mobxFoo from 'mobx'
  let lastSpecifierImport = undefined;

  return {
    'ImportDeclaration': node => {
      if (node.source.value !== 'mobx') return;

      // Collect the imports

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          namespaceImportName = specifier.local.name;
        }

        if (specifier.type === 'ImportSpecifier') {
          lastSpecifierImport = specifier;
          if (specifier.imported.name === 'makeObservable') {
            makeObserverImportName = specifier.local.name;
          }
        }
      }
    },
    'Decorator': decorator => {
      if (!isMobxDecorator(decorator, namespaceImportName)) return;
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

          const fixes = [];
          let makeObservableExpr = 'makeObservable';

          // Insert the makeObservable import if required
          if (!namespaceImportName && !makeObserverImportName && lastSpecifierImport) {
            fixes.push(fixer.insertTextAfter(lastSpecifierImport, ', makeObservable'));
          } else if (namespaceImportName) {
            makeObservableExpr = `${namespaceImportName}.makeObservable`;
          } else if (makeObserverImportName) {
            makeObservableExpr = makeObserverImportName;
          }

          if (constructor?.value.type === 'TSEmptyBodyFunctionExpression') {
            // constructor() - yes this a thing
            const closingBracket = sourceCode.getLastToken(constructor.value);
            fixes.push(fixer.insertTextAfter(closingBracket, ` { ${makeObservableExpr}(this); }`));
          } else if (constructor) {
            // constructor() {}
            const closingBracket = sourceCode.getLastToken(constructor.value.body);
            fixes.push(fixer.insertTextBefore(closingBracket, `;${makeObservableExpr}(this);`));
          } else {
            // class C {}
            const openingBracket = sourceCode.getFirstToken(clazz.body);
            fixes.push(fixer.insertTextAfter(openingBracket, `\nconstructor() { ${makeObservableExpr}(this); }`));
          }

          return fixes;
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