/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
var dnode_1 = require('./dnode');
var observableobject_1 = require('./observableobject');
var observablemap_1 = require('./observablemap');
var simpleeventemitter_1 = require('./simpleeventemitter');
var utils_1 = require('./utils');
var core_1 = require('./core');
function getDNode(thing, property) {
    if (!core_1.isObservable(thing))
        throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
    if (property !== undefined) {
        var dnode;
        if (thing instanceof observablemap_1.ObservableMap)
            dnode = thing._data[property];
        else if (thing.$mobservable instanceof observableobject_1.ObservableObject) {
            var o = thing.$mobservable;
            dnode = o.values && o.values[property];
        }
        if (!dnode)
            throw new Error("[mobservable.getDNode] property '" + property + "' of '" + thing + "' doesn't seem to be a reactive property");
        return dnode;
    }
    if (thing instanceof dnode_1.DataNode)
        return thing;
    if (thing.$mobservable) {
        if (thing.$mobservable instanceof observableobject_1.ObservableObject || thing instanceof observablemap_1.ObservableMap)
            throw new Error("[mobservable.getDNode] missing properties parameter. Please specify a property of '" + thing + "'.");
        return thing.$mobservable;
    }
    throw new Error("[mobservable.getDNode] " + thing + " doesn't seem to be reactive");
}
exports.getDNode = getDNode;
function reportTransition(node, state, changed, newValue) {
    if (changed === void 0) { changed = false; }
    if (newValue === void 0) { newValue = null; }
    exports.transitionTracker.emit({
        id: node.id,
        name: node.context.name,
        context: node.context.object,
        state: state,
        changed: changed,
        newValue: newValue
    });
}
exports.reportTransition = reportTransition;
exports.transitionTracker = null;
function getDependencyTree(thing, property) {
    return nodeToDependencyTree(getDNode(thing, property));
}
exports.getDependencyTree = getDependencyTree;
function nodeToDependencyTree(node) {
    var result = {
        id: node.id,
        name: node.context.name,
        context: node.context.object || null
    };
    if (node instanceof dnode_1.ViewNode && node.observing.length)
        result.dependencies = utils_1.unique(node.observing).map(nodeToDependencyTree);
    return result;
}
function getObserverTree(thing, property) {
    return nodeToObserverTree(getDNode(thing, property));
}
exports.getObserverTree = getObserverTree;
function nodeToObserverTree(node) {
    var result = {
        id: node.id,
        name: node.context.name,
        context: node.context.object || null
    };
    if (node.observers.length)
        result.observers = utils_1.unique(node.observers).map(nodeToObserverTree);
    if (node.externalRefenceCount > 0)
        result.listeners = node.externalRefenceCount;
    return result;
}
function createConsoleReporter(extensive) {
    var lines = [];
    var scheduled = false;
    return function (line) {
        if (extensive || line.changed)
            lines.push(line);
        if (!scheduled) {
            scheduled = true;
            setTimeout(function () {
                console[console["table"] ? "table" : "dir"](lines);
                lines = [];
                scheduled = false;
            }, 1);
        }
    };
}
function trackTransitions(extensive, onReport) {
    if (extensive === void 0) { extensive = false; }
    if (!exports.transitionTracker)
        exports.transitionTracker = new simpleeventemitter_1.default();
    var reporter = onReport
        ? function (line) {
            if (extensive || line.changed)
                onReport(line);
        }
        : createConsoleReporter(extensive);
    var disposer = exports.transitionTracker.on(reporter);
    return utils_1.once(function () {
        disposer();
        if (exports.transitionTracker.listeners.length === 0)
            exports.transitionTracker = null;
    });
}
exports.trackTransitions = trackTransitions;
