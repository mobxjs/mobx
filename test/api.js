var mobx = require('../');
var test = require('tape');

test('correct api should be exposed', function(t) {
	t.deepEquals(Object.keys(mobx).sort(), [
		'Atom',
		'BaseAtom', // TODO: remove somehow
		'IDerivationState',
		'IObservableFactories',
		'ObservableMap',
		'Reaction',
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
		'extendShallowObservable',
		'extras',
		'intercept',
		'isAction',
		'isArrayLike',
		'isComputed',
		'isModifierDescriptor',
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
		'transaction',
		'untracked',
		'useStrict',
		'when',
		'whyRun'
	].sort());
	t.equals(Object.keys(mobx).filter(function(key) {
		return mobx[key] == undefined;
	}).length, 0);

	t.deepEquals(Object.keys(mobx.extras).sort(), [
			'allowStateChanges',
			'getAdministration',
			'getAtom',
			'getDebugName',
			'getDependencyTree',
			'getGlobalState',
			'getObserverTree',
			'isComputingDerivation',
			'isSpyEnabled',
			'onReactionError',
			'resetGlobalState',
			'setReactionScheduler',
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
