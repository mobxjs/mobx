/**
 * This file basically works around all the typescript limitations that exist atm:
 * 1. not being able to generate an external (UMD) module from multiple files
 * 2. not being able to merge a default export declaration with non-default export declarations
 */
 
/// <reference path="./utils.ts" />
/// <reference path="./index.ts" />

namespace mobservable {
	
}

declare var module;
module.exports = mobservable.value;
for (var key in mobservable)
    module.exports[key] = mobservable[key]; 
 
/*    export var m:IMObservableStatic = <IMObservableStatic> function(value, scope?) {
        return createObservable(value,scope);
    };
*/

/*
    // For testing purposes only;
    (<any>m).quickDiff = quickDiff;
    (<any>m).stackDepth = () => DNode.trackingStack.length;

*/

/* typescript does not support UMD modules yet, lets do it ourselves... */
/*(declare var define;
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
    return mobservable.m;
}));
*/