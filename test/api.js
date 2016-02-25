var mobservable = require('../');
var test = require('tape');

test('correct api should be exposed', function(t) {
	t.deepEquals(Object.keys(mobservable).sort(), [
		'Atom',
		'ObservableMap',
		'Reaction',
		'SimpleEventEmitter',
		'_',
		'asFlat',
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
	t.equals(Object.keys(mobservable).filter(function(key) {
		return mobservable[key] == undefined;
	}).length, 0);
	
	t.deepEquals(Object.keys(mobservable._).sort(), [
		'quickDiff', 
		'resetGlobalState'
	]);
	t.equals(Object.keys(mobservable._).filter(function(key) {
		return mobservable._[key] == undefined;
	}).length, 0);
	
	t.deepEquals(Object.keys(mobservable.extras).sort(), [
			'allowStateChanges',
			'getDependencyTree',
			'getObserverTree',
			'isComputingDerivation',
			'trackTransitions'
	]);
	t.equals(Object.keys(mobservable.extras).filter(function(key) {
		return mobservable.extras[key] == undefined;
	}).length, 0);

	t.end();
});