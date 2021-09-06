'use strict';

const componentSupers = ['Component', 'PureComponent', 'React.Component', 'React.PureComponent'];

function create(context) {
  return {
    'ClassProperty[key.name="render"][value.type="ArrowFunctionExpression"]': render => {
      const clazz = render.parent.parent;
      const isComponent = componentSupers.includes(clazz.superClass?.name);
      if (!isComponent) return;
      context.report({
        node: render,
        messageId: 'noArrowRender',
      });
    },
  };
}

module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'disallows using arrow function for `render` in class components',
      recommended: true,
    },
    messages: {
      noArrowRender: '`render` must not be arrow function. Change it to `render() {}`.',
    }
  },
  create,
}