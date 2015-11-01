var inBatch = 0;
var tasks = [];
function schedule(func) {
    if (inBatch < 1)
        func();
    else
        tasks[tasks.length] = func;
}
exports.schedule = schedule;
function runPostBatchActions() {
    var i = 0;
    while (tasks.length) {
        try {
            for (; i < tasks.length; i++)
                tasks[i]();
            tasks = [];
        }
        catch (e) {
            console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
            // drop already executed tasks, including the failing one, and continue with other actions, to keep state as stable as possible
            tasks.splice(0, i + 1);
        }
    }
}
function transaction(action) {
    inBatch += 1;
    try {
        return action();
    }
    finally {
        if (--inBatch === 0) {
            // make sure follow up actions are processed in batch after the current queue
            inBatch += 1;
            runPostBatchActions();
            inBatch -= 1;
        }
    }
}
exports.transaction = transaction;
