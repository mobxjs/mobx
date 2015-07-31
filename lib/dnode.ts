namespace mobservable {

    export namespace _ {
        export enum DNodeState {
            STALE,     // One or more depencies have changed but their values are not yet known, current value is stale
            PENDING,   // All dependencies are up to date again, a recalculation of this node is ongoing or pending, current value is stale
            READY,     // Everything is bright and shiny
        };
    
        /**
         * A Node in the dependency graph of a (computed)observable.
         *
         * observing: nodes that are needed for this DNode to operate
         * observers: nodes that need this node to operate
         */
        export class DNode {
            static trackingStack: DNode[][] = [];  // stack of: list of DNode's being observed by the currently ongoing computation
    
            state: DNodeState = DNodeState.READY;
            isSleeping = true; // isSleeping: nobody is observing this dependency node, so don't bother tracking DNode's this DNode depends on
            hasCycle = false;  // this node is part of a cycle, which is an error
            private observing: DNode[] = [];       // nodes we are looking at. Our value depends on these nodes
            private prevObserving: DNode[] = null; // nodes we were looking at before. Used to determine changes in the dependency tree
            private observers: DNode[] = [];       // nodes that are dependent on this node. Will be notified when our state change
            private dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
            private dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready
            private isDisposed = false;            // ready to be garbage collected. Nobody is observing or ever will observe us
            private externalRefenceCount = 0;      // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
            public isComputed:boolean;;    // isComputed indicates that this node can depend on others, and should update when dependencies change
    
            constructor(private owner:{compute?:()=>boolean}) {
                this.isComputed = owner.compute !== undefined;
            }
    
            setRefCount(delta:number) {
                var rc = this.externalRefenceCount += delta;
                if (rc === 0)
                    this.tryToSleep();
                else if (rc === delta) // a.k.a. rc was zero.
                    this.wakeUp();
            }
    
            addObserver(node:DNode) {
                this.observers[this.observers.length] = node;
            }
    
            removeObserver(node:DNode) {
                var obs = this.observers, idx = obs.indexOf(node);
                if (idx !== -1) {
                    obs.splice(idx, 1);
                    if (obs.length === 0)
                        this.tryToSleep();
                }
            }
    
            markStale() {
                if (this.state !== DNodeState.READY)
                    return; // stale or pending; recalculation already scheduled, we're fine..
                this.state = DNodeState.STALE;
                this.notifyObservers();
            }
    
            markReady(stateDidActuallyChange:boolean) {
                if (this.state === DNodeState.READY)
                    return;
                this.state = DNodeState.READY;
                this.notifyObservers(stateDidActuallyChange);
            }
    
            notifyObservers(stateDidActuallyChange:boolean=false) {
                var os = this.observers.slice();
                for(var l = os.length, i = 0; i < l; i++)
                    os[i].notifyStateChange(this, stateDidActuallyChange);
            }
    
            tryToSleep() {
                if (!this.isSleeping && this.isComputed && this.observers.length === 0 && this.externalRefenceCount === 0) {
                    for (var i = 0, l = this.observing.length; i < l; i++)
                        this.observing[i].removeObserver(this);
                    this.observing = [];
                    this.isSleeping = true;
                }
            }
    
            wakeUp() {
                if (this.isSleeping && this.isComputed) {
                    this.isSleeping = false;
                    this.state = DNodeState.PENDING;
                    this.computeNextState();
                }
            }
    
            // the state of something we are observing has changed..
            notifyStateChange(observable:DNode, stateDidActuallyChange:boolean) {
                if (observable.state === DNodeState.STALE) {
                    if (++this.dependencyStaleCount === 1)
                        this.markStale();
                } else { // not stale, thus ready since pending states are not propagated
                    if (stateDidActuallyChange)
                        this.dependencyChangeCount += 1;
                    if (--this.dependencyStaleCount === 0) { // all dependencies are ready
                        this.state = DNodeState.PENDING;
                        Scheduler.schedule(() => {
                            // did any of the observables really change?
                            if (this.dependencyChangeCount > 0)
                                this.computeNextState();
                            else
                                // we're done, but didn't change, lets make sure verybody knows..
                                this.markReady(false);
                            this.dependencyChangeCount = 0;
                        });
                    }
                }
            }
    
            computeNextState() {
                this.trackDependencies();
                var stateDidChange = this.owner.compute();
                this.bindDependencies();
                this.markReady(stateDidChange);
            }
    
            private trackDependencies() {
                this.prevObserving = this.observing;
                DNode.trackingStack[DNode.trackingStack.length] = [];
            }
    
            private bindDependencies() {
                this.observing = DNode.trackingStack.pop();
    
                if (this.isComputed && this.observing.length === 0 && debugLevel > 1 && !this.isDisposed) {
                    console.trace();
                    warn("You have created a function that doesn't observe any values, did you forget to make its dependencies observable?");
                }
    
                var [added, removed] = quickDiff(this.observing, this.prevObserving);
                this.prevObserving = null;
    
                for(var i = 0, l = removed.length; i < l; i++)
                    removed[i].removeObserver(this);
    
                this.hasCycle = false;
                for(var i = 0, l = added.length; i < l; i++) {
                    if (this.isComputed && added[i].findCycle(this)) {
                        this.hasCycle = true;
                        // don't observe anything that caused a cycle, or we are stuck forever!
                        this.observing.splice(this.observing.indexOf(added[i]), 1);
                        added[i].hasCycle = true; // for completeness sake..
                    } else {
                        added[i].addObserver(this);
                    }
                }
            }
    
            public notifyObserved() {
                var ts = DNode.trackingStack, l = ts.length;
                if (l > 0) {
                    var cs = ts[l - 1], csl = cs.length;
                    // this last item added check is an optimization especially for array loops,
                    // because an array.length read with subsequent reads from the array
                    // might trigger many observed events, while just checking the last added item is cheap
                    if (cs[csl -1] !== this && cs[csl -2] !== this)
                        cs[csl] = this;
                }
            }
    
            private findCycle(node:DNode) {
                var obs = this.observing;
                if (obs.indexOf(node) !== -1)
                    return true;
                for(var l = obs.length, i = 0; i < l; i++)
                    if (obs[i].findCycle(node))
                        return true;
                return false;
            }
    
            public dispose() {
                if (this.observers.length)
                    throw new Error("Cannot dispose DNode; it is still being observed");
                if (this.observing) for(var l=this.observing.length, i=0; i<l; i++)
                    this.observing[i].removeObserver(this);
                this.observing = null;
                this.isDisposed = true;
            }
        }
        
        export function stackDepth () {
            return DNode.trackingStack.length;
        }
    }
}