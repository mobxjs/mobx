'use strict';

const mobxDecorators = new Set(['observable', 'computed', 'action', 'flow', 'override']);

function isMobxDecorator(decorator) {
  return mobxDecorators.has(decorator.expression.name) // @foo
    || mobxDecorators.has(decorator.expression.callee?.name) // @foo()
    || mobxDecorators.has(decorator.expression.object?.name) // @foo.bar
}

function findAncestor(node, match) {
  const { parent } = node;
  if (!parent) return;
  if (match(parent)) return parent;
  return findAncestor(parent, match);
}

function assert(expr, error) {
  if (!expr) {
    error ??= 'Assertion failed';
    error = error instanceof Error ? error : new Error(error)
    throw error;
  }
}

module.exports = {
  findAncestor,
  isMobxDecorator,
}