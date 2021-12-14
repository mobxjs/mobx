'use strict';

function create(context) {
  const sourceCode = context.getSourceCode();

  return {
    'FunctionDeclaration,FunctionExpression,ArrowFunctionExpression,ClassDeclaration,ClassExpression': cmp => {
      // Already has observer
      if (cmp.parent && cmp.parent.type === 'CallExpression' && cmp.parent.callee.name === 'observer') return;
      let name = cmp.id?.name;
      // If anonymous try to infer name from variable declaration      
      if (!name && cmp.parent?.type === 'VariableDeclarator') {
        name = cmp.parent.id.name;
      }
      if (cmp.type.startsWith('Class')) {
        // Must extend Component or React.Component
        const { superClass } = cmp;
        if (!superClass) return;
        const superClassText = sourceCode.getText(superClass);
        if (superClassText !== 'Component' && superClassText !== 'React.Component') return;
      } else {
        // Name must start with uppercase letter
        if (!name?.charAt(0).match(/^[A-Z]$/)) return;
      }

      const fix = fixer => {
        return [
          fixer.insertTextBefore(
            sourceCode.getFirstToken(cmp),
            (name && cmp.type.endsWith('Declaration') ? `const ${name} = ` : '') + 'observer(',
          ),
          fixer.insertTextAfter(
            sourceCode.getLastToken(cmp),
            ')',
          ),
        ]
      }
      context.report({
        node: cmp,
        messageId: 'missingObserver',
        data: {
          name: name || '<anonymous>',
        },
        fix,
      })
    },
  };
}

module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'prevents missing `observer` on react component',
      recommended: true,
    },
    messages: {
      missingObserver: "Component `{{ name }}` is missing `observer`.",
    },
  },
  create,
};