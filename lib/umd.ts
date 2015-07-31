/**
 * This file basically works around all the typescript limitations that exist atm:
 * 1. not being able to generate an external (UMD) module from multiple files (thats why we have internal module)
 * 2. not being able to merge a default export declaration with non-default export declarations
 */
 
/// <reference path="./utils.ts" />
/// <reference path="./index.ts" />
/// <reference path="./api.ts" />
/// <reference path="./watch.ts" />

/**
 * This complete file is a fight against the system since typescript cannot decently generate 
 * ambient declarations from internal modules, merge default exports etc. etc. 
 */

// Let the compiler figure out whether we are still compatible with the api..
var forCompilerVerificationOnly = <_IMobservableStatic> mobservable;

declare var define;
declare var exports;
declare var module;

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define('mobservable', [], function () {
            return (factory());
        });
    } else if (typeof exports === 'object') {
        // CommonJS like
        module.exports = factory();
    } else {
        // register global
        root['mobservable'] = factory();
    }
}(this, function () {
    var m = mobservable.value; // the default export
    for (var key in mobservable)
        m[key] = mobservable[key]; // the non-default exports
    return m;
}));