/// <reference path="../mobservable.d.ts"/>
import mobservable = require('../mobservable');

var v = mobservable(3);
v.observe(() => {});

var a = mobservable.array([1,2,3]);