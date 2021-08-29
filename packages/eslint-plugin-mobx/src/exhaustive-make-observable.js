'use strict';

const { findAncestor, isMobxDecorator } = require('./utils.js');

//const superImportPath = context.getScope().references.find(r => r.identifier === classNode.superClass).resolved.defs[0].parent.source.value;

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

      const createFix = (key, annotation) => fixer => {
        if (!secondArg) {
          return fixer.insertTextAfter(firstArg, `, { ${key}: ${annotation} }`);
        } else if (secondArg.type !== 'ObjectExpression') {
          return fixer.replaceText(secondArg, `{ ${key}: ${annotation} }`);
        } else {
          // we place it at the beginning, because we don't have to worry about comma
          // TODO? replace with insertAfter(sourceCode.getFirstToken(secondArg))
          const openingBracketPosition = secondArg.range[0] + 1;
          return fixer.insertTextAfterRange([openingBracketPosition, openingBracketPosition], `${key}: ${annotation},`);
        }
      }

      const createSuggestion = (key, annotation) => {
        return {
          desc: 'Add `{{ key }}: {{ annotation }}` to `makeObservable`',
          data: { key, annotation },
          fix: createFix(key),
        }
      }

      if (!hasAnyDecorator) {
        // Avoids reporting twice for setter+getter pair and actual duplicates
        const reportedKeys = new Set();

        nonAnnotatedMembers.forEach(member => {
          const key = fieldToKey(member);
          if (reportedKeys.has(key)) return;
          reportedKeys.add(key);

          context.report({
            node: makeObservable,
            message: 'Missing annotation for `{{ key }}`.',
            data: { key },
            fix: createFix(key, 'true'),
            // Does not work well in VSCode atm
            suggest: [
              createSuggestion(key, 'true'),
            ],
          })
        })
      }
    },
  };
}

module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  docs: {
    recommended: true,
    suggestion: true,
  },
  create,
};