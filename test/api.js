var mobx = require('../');
var test = require('tape');

test('correct api should be exposed', function(t) {
	t.deepEquals(Object.keys(mobx).sort(), [
		'Atom',
		'BaseAtom', // TODO: remove somehow
		'IDerivationState',
		'ObservableMap',
		'Reaction',
		'_',
		'action',
		'asFlat',
		'asMap',
		'asReference',
		'asStructure',
		'autorun',
		'autorunAsync',
		'computed',
		'createTransformer',
		'expr',
		'extendObservable',
		'extras',
		'intercept',
		'isAction',
		'isArrayLike',
		'isComputed',
		'isObservable',
		'isObservableArray',
		'isObservableMap',
		'isObservableObject',
		'isStrictModeEnabled',
		'map',
		'observable',
		'observe',
		'reaction',
		'runInAction',
		'spy',
		'toJS',
		'toJSlegacy',
		'transaction',
		'untracked',
		'useStrict',
		'when',
		'whyRun'
	].sort());
	t.equals(Object.keys(mobx).filter(function(key) {
		return mobx[key] == undefined;
	}).length, 0);

	t.deepEquals(Object.keys(mobx._).sort(), [
		'getAdministration',
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
			'getGlobalState',
			'getObserverTree',
			'isComputingDerivation',
			'isSpyEnabled',
			'resetGlobalState',
			'shareGlobalState',
			'spyReport',
			'spyReportEnd',
			'spyReportStart'
	]);
	t.equals(Object.keys(mobx.extras).filter(function(key) {
		return mobx.extras[key] == undefined;
	}).length, 0);

	t.end();
});
