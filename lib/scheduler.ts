namespace mobservable {

    export function batch<T>(action:()=>T):T {
        return _.Scheduler.batch(action);
    }

    export namespace _ {
        export class Scheduler {
            private static inBatch = 0;
            private static tasks:{():void}[] = [];
    
            public static schedule(func:Lambda) {
                if (Scheduler.inBatch < 1)
                    func();
                else
                    Scheduler.tasks[Scheduler.tasks.length] = func;
            }
    
            private static runPostBatchActions() {
                var i = 0;
                while(Scheduler.tasks.length) {
                    try { // try outside loop; much cheaper
                        for(; i < Scheduler.tasks.length; i++)
                            Scheduler.tasks[i]();
                        Scheduler.tasks = [];
                    } catch (e) {
                        console.error("Failed to run scheduled action, the action has been dropped from the queue: " + e, e);
                        // drop already executed tasks, including the failing one, and continue with other actions, to keep state as stable as possible
                        Scheduler.tasks.splice(0, i + 1);
                    }
                }
            }
    
            static batch<T>(action:()=>T):T {
                Scheduler.inBatch += 1;
                try {
                    return action();
                } finally {
                    //Scheduler.inBatch -= 1;
                    if (--Scheduler.inBatch === 0) {
                        // make sure follow up actions are processed in batch after the current queue
                        Scheduler.inBatch += 1;
                        Scheduler.runPostBatchActions();
                        Scheduler.inBatch -= 1;
                    }
                }
            }
        }
    }

}