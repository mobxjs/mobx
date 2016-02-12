var mobservable = require('../');
var test = require('tape');

test('correct api should be exposed', function(t) {
	t.deepEquals(Object.keys(mobservable).sort(), [
		'ObservableMap',
		'Reaction',
		'_',
		'asFlat',
		'asReference',
		'asStructure',
		'autorun',
		'autorunAsync',
		'autorunUntil',
		'createTransformer',
		'expr',
		'extendObservable',
		'extras',
		'fastArray',
		'isObservable',
		'isObservableArray',
		'isObservableMap',
		'isObservableObject',
		'map',
		'observable',
		'observe',
		'toJSON',
		'transaction',
		'untracked',
		'when' 
	]);
	
	t.deepEquals(Object.keys(mobservable._).sort(), [
		'quickDiff', 
		'resetGlobalState'
	]);
	
	t.deepEquals(Object.keys(mobservable.extras).sort(), [
			'SimpleEventEmitter',
			'allowStateChanges',
			'getDependencyTree',
			'getObserverTree',
			'isComputingDerivation',
			'trackTransitions'
	]);

	t.end();
});