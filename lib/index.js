function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var core = require('./core');
var dnode_1 = require('./dnode');
var utils_1 = require('./utils');
var extras_1 = require('./extras');
var simpleeventemitter_1 = require('./simpleeventemitter');
__export(require('./interfaces'));
var core_1 = require('./core');
exports.isObservable = core_1.isObservable;
exports.observable = core_1.observable;
exports.extendObservable = core_1.extendObservable;
exports.asReference = core_1.asReference;
exports.asFlat = core_1.asFlat;
exports.asStructure = core_1.asStructure;
exports.autorun = core_1.autorun;
exports.autorunUntil = core_1.autorunUntil;
exports.autorunAsync = core_1.autorunAsync;
exports.expr = core_1.expr;
exports.transaction = core_1.transaction;
exports.toJSON = core_1.toJSON;
exports.isReactive = core_1.isObservable;
exports.map = core_1.map;
exports.makeReactive = core_1.observable;
exports.extendReactive = core_1.extendObservable;
exports.observe = core_1.autorun;
exports.observeUntil = core_1.autorunUntil;
exports.observeAsync = core_1.autorunAsync;
/**
 * 'Private' elements that are exposed for testing and debugging utilities
 */
exports._ = {
    isComputingView: dnode_1.isComputingView,
    quickDiff: utils_1.quickDiff
};
exports.extras = {
    getDNode: extras_1.getDNode,
    getDependencyTree: extras_1.getDependencyTree,
    getObserverTree: extras_1.getObserverTree,
    trackTransitions: extras_1.trackTransitions,
    SimpleEventEmitter: simpleeventemitter_1.default,
    withStrict: core.withStrict
};
