'use strict';

const { visitorKeys } = require('@typescript-eslint/visitor-keys');
const { findAncestor, isMobxDecorator } = require('./utils.js');

//const superImportPath = context.getScope().references.find(r => r.identifier === classNode.superClass).resolved.defs[0].parent.source.value;

// TODO options to change default annotations for auto fix autoFixAnnotations: { method, prop} or provide callback (node) => annotation?

const rule = {
  create(context) {
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
          if (member.computed) return;
          if (member.static) return;
          if (member.kind === "constructor") return;
          //if (member.type !== 'MethodDefinition' && member.type !== 'ClassProperty') return;                    
          hasAnyDecorator = hasAnyDecorator || member.decorators?.some(isMobxDecorator) || false;
          if (!annotationProps.some(prop => prop.key.name === member.key.name)) {
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
        if (!hasAnyDecorator) {
          nonAnnotatedMembers.forEach(member => {
            context.report({
              node: makeObservable,
              message: 'Missing annotation for `{{ key }}`.',
              data: { key: member.key.name }
            })
          })
        }
      },
    };
  }
}

module.exports = rule;