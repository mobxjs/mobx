/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {Lambda} from './interfaces';
import * as core from './core';

var inBatch = 0;
var tasks:{():void}[] = [];

export function schedule(func:Lambda) {
    if (inBatch < 1)
        func();
    else
        tasks[tasks.length] = func;
}

function runPostBatchActions() {
    var i = 0;
    while(tasks.length) {
        try { // try outside loop; much cheaper
            for(; i < tasks.length; i++)
                tasks[i]();
            tasks = [];
        } catch (e) {
            console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
            // drop already executed tasks, including the failing one, and continue with other actions, to keep state as stable as possible
            tasks.splice(0, i + 1);
        }
    }
}

export function transaction<T>(action:()=>T, strict?:boolean):T {
    var preStrict = core.getStrict();
    inBatch += 1;
    if (strict !== undefined)
        core.setStrict(strict);
    try {
        return action();
    } finally {
        if (--inBatch === 0) {
            // make sure follow up actions are processed in batch after the current queue
            inBatch += 1;
            runPostBatchActions();
            inBatch -= 1;
        }
        core.setStrict(preStrict);
    }
}