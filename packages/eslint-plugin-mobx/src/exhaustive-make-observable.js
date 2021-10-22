'use strict';

const { findAncestor, isMobxDecorator } = require('./utils.js');

// TODO support this.foo = 5; in constructor
// TODO? report on field as well
function create(context) {
  const sourceCode = context.getSourceCode();

  function fieldToKey(field) {
    // TODO cache on field?
    const key = sourceCode.getText(field.key);
    return field.computed ? `[${key}]` : key;
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
      const [firstArg, secondArg] = makeObservable.arguments;
      if (!firstArg) return;
      let members;
      if (firstArg.type === 'ThisExpression') {
        const closestFunction = findAncestor(makeObservable, node => node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration')
        if (closestFunction?.parent?.kind !== 'constructor') return;
        members = closestFunction.parent.parent.parent.body.body;
      } else if (firstArg.type === 'ObjectExpression') {
        members = firstArg.properties;
      } else {
        return;
      }

      const annotationProps = secondArg?.properties || [];
      const nonAnnotatedMembers = [];
      let hasAnyDecorator = false;

      members.forEach(member => {
        if (member.static) return;
        if (member.kind === "constructor") return;
        //if (member.type !== 'MethodDefinition' && member.type !== 'ClassProperty') return;                    
        hasAnyDecorator = hasAnyDecorator || member.decorators?.some(isMobxDecorator) || false;
        if (!annotationProps.some(prop => fieldToKey(prop) === fieldToKey(member))) { // TODO optimize?
          nonAnnotatedMembers.push(member);
        }
      })
      /*
      // With decorators, second arg must be null/undefined or not provided
      if (hasAnyDecorator && secondArg && secondArg.name !== "undefined" && secondArg.value !== null) {
        context.report({
          node: makeObservable,
          message: 'When using decorators, second arg must be `null`, `undefined` or not provided.',
        })
      }
      // Without decorators, in constructor, second arg must be object literal
      if (!hasAnyDecorator && firstArg.type === 'ThisExpression' && (!secondArg || secondArg.type !== 'ObjectExpression')) {
        context.report({
          node: makeObservable,
          message: 'Second argument must be object in form of `{ key: annotation }`.',
        })
      }
      */

      if (!hasAnyDecorator && nonAnnotatedMembers.length) {
        // Set avoids reporting twice for setter+getter pair or actual duplicates
        const keys = [...new Set(nonAnnotatedMembers.map(fieldToKey))];
        const keyList = keys.map(key => `\`${key}\``).join(', ');

        const fix = fixer => {
          const annotationList = keys.map(key => `${key}: true`).join(', ') + ',';
          if (!secondArg) {
            return fixer.insertTextAfter(firstArg, `, { ${annotationList} }`);
          } else if (secondArg.type !== 'ObjectExpression') {
            return fixer.replaceText(secondArg, `{ ${annotationList} }`);
          } else {
            const openingBracket = sourceCode.getFirstToken(secondArg)
            return fixer.insertTextAfter(openingBracket, ` ${annotationList} `);
          }
        };

        context.report({
          node: makeObservable,
          messageId: 'missingAnnotation',
          data: { keyList },
          fix,
        })
      }
    },
  };
}

module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'enforce all fields being listen in `makeObservable`',
      recommended: true,
      suggestion: false,
    },
    messages: {
      'missingAnnotation': 'Missing annotation for {{ keyList }}. To exclude a field, use `false` as annotation.',
    },
  },
  create,
};