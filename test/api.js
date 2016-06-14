var mobx = require('../');
var test = require('tape');

test('correct api should be exposed', function(t) {
	t.deepEquals(Object.keys(mobx).sort(), [
		'Atom',
		'ObservableMap',
		'Reaction',
		'SimpleEventEmitter',
		'_',
		'action',
		'asFlat',
		'asMap',
		'asReference',
		'asStructure',
		'autorun',
		'autorunAsync',
		'autorunUntil',
		'computed',
		'createTransformer',
		'expr',
		'extendObservable',
		'extras',
		'fastArray',
		'intercept',
		'isAction',
		'isObservable',
		'isObservableArray',
		'isObservableMap',
		'isObservableObject',
		'map',
		'observable',
		'observe',
		'reaction',
		'runInAction',
		'spy',
		'toJS',
		'toJSON',
		'transaction',
		'untracked',
		'useStrict',
		'when',
		'whyRun'
	]);
	t.equals(Object.keys(mobx).filter(function(key) {
		return mobx[key] == undefined;
	}).length, 0);

	t.deepEquals(Object.keys(mobx._).sort(), [
		'getAdministration',
		'quickDiff',
		'resetGlobalState'
	]);
	t.equals(Object.keys(mobx._).filter(function(key) {
		return mobx._[key] == undefined;
	}).length, 0);

	t.deepEquals(Object.keys(mobx.extras).sort(), [
			'allowStateChanges',
			'getAtom',
			'getDebugName',
			'getDependencyTree',
			'getObserverTree',
			'isComputingDerivation',
			'isSpyEnabled',
			'resetGlobalState',
			'spyReport',
			'spyReportEnd',
			'spyReportStart',
			'trackTransitions'
	]);
	t.equals(Object.keys(mobx.extras).filter(function(key) {
		return mobx.extras[key] == undefined;
	}).length, 0);

	t.end();
});