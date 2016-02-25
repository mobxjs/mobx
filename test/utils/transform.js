var m = require('../../');

module.exports.intersection = require('lodash.intersection');

module.exports.pluckFn = function(key) {
  return function(obj) {
    var keys = key.split('.'), value = obj;
    for (var i = 0, l = keys.length; i < l; i++) { if (!value) return; value = value[keys[i]]; }
    return value;
  }
}
module.exports.identity = function(value) { return value; }

module.exports.testSet = function() {
  var testSet = {};

  var state = testSet.state = m.observable({
    root: null,
    renderedNodes: m.asStructure([]),
    collapsed: new m.map() // KM: ideally, I would like to use a set
  });

  var stats = testSet.stats = {
    refCount: 0
  }

  var TreeNode = testSet.TreeNode = function(name, extensions) {
    this.children = m.observable(m.asStructure([]));
    this.icon = m.observable('folder');

    this.parent = null; // not observed
    this.name = name; // not observed

    // optional extensions
    if (extensions) { for (var key in extensions) { this[key] = extensions[key]; } }
  }
  TreeNode.prototype.addChild = function(node) { node.parent = this; this.children.push(node); }
  TreeNode.prototype.addChildren = function(nodes) {
    var _this = this;
    nodes.map(function(node) { node.parent = _this; });
    this.children.splice.apply(this.children, [this.children.length, 0].concat(nodes));
  }

  TreeNode.prototype.path = function() {
    var node = this, parts = [];
    while (node) {
      parts.push(node.name);
      node = node.parent;
    }
    return parts.join('/');
  }

  TreeNode.prototype.map = function(iteratee, results) {
    results = results || [];
    results.push(iteratee(this));
    this.children.forEach(function(child) { child.map(iteratee, results); });
    return results;
  }

  TreeNode.prototype.find = function(predicate) {
    if (predicate(this)) return this;

    var result;
    for (var i = 0, l = this.children.length; i < l; i++) {
      result = this.children[i].find(predicate);
      if (result) return result;
    }
    return null;
  }

  var DisplayNode = testSet.DisplayNode = function(node) {
    stats.refCount++;
    this.node = node;
  }
  DisplayNode.prototype.destroy = function() { stats.refCount--; }

  DisplayNode.prototype.toggleCollapsed = function() {
    var path = this.node.path();
    state.collapsed.has(path) ? state.collapsed.delete(path) : state.collapsed.set(path, true); // KM: ideally, I would like to use a set
  }

  return testSet;
}