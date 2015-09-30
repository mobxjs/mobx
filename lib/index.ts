import './dnode';

import {makeReactive} from './core';
export default makeReactive;

export * from './interfaces';
export {
	isReactive,
	makeReactive,
	extendReactive,
	asReference,
	asFlat,
	asStructure,
	observable,
	observe,
	sideEffect,
	observeUntil,
	observeAsync,
	expr,
	transaction,
	toJSON,
	logLevel,
	strict
} from './core';
