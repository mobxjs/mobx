/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

declare var global:any;

// DNode[][], stack of: list of DNode's being observed by the currently ongoing computation
if (global.__mobservableTrackingStack)
    throw new Error("[mobservable] An incompatible version of mobservable is already loaded.");

global.__mobservableViewStack = [];

var mobservableId = 0;

export function checkIfStateIsBeingModifiedDuringView(context: IContextInfoStruct) {
    if (getStrict() === true && isComputingView()) {
        // TODO: add url with detailed error subscription / best practice here:
        const ts = global.__mobservableViewStack;
        throw new Error(
`[mobservable] It is not allowed to change the state during the computation of a reactive view. Should the data you are trying to modify actually be a view? 
Use 'mobservable.extras.withStrict(false, block)' to allow changes to be made inside views (unrecommended).
View name: ${context.name}.
Current stack size is ${ts.length}, active view: "${ts[ts.length -1].toString()}".`
        );
    }
}

/**
    * The state of some node in the dependency tree that is created for all views.
    */
export enum NodeState {
    STALE,     // One or more depencies have changed but their values are not yet known, current value is stale
    PENDING,   // All dependencies are up to date again, a recalculation of this node is ongoing or pending, current value is stale
    READY,     // Everything is bright and shiny
};

/**
    * A root node in the dependency graph. This node can be observed by others, but doesn't observe anything itself.
    * These nodes are used to store 'state'.
    */
export class DataNode {

    id = ++mobservableId;
    state: NodeState = NodeState.READY;
    observers: ViewNode[] = [];       // nodes that are dependent on this node. Will be notified when our state change
    protected isDisposed = false;            // ready to be garbage collected. Nobody is observing or ever will observe us
    externalRefenceCount = 0;      // nr of 'things' that depend on us, excluding other DNode's. If > 0, this node will not go to sleep
    context: IContextInfoStruct;

    constructor(context:IContextInfoStruct) {
        if (!context)
            context = { name: undefined, object: undefined }
        if (!context.name)
            context.name = "[m#" + this.id + "]";
        this.context = context;
    }

    setRefCount(delta:number) {
        this.externalRefenceCount += delta;
    }

    addObserver(node:ViewNode) {
        this.observers[this.observers.length] = node;
    }

    removeObserver(node:ViewNode) {
        var obs = this.observers, idx = obs.indexOf(node);
        if (idx !== -1)
            obs.splice(idx, 1);
    }

    markStale() {
        if (this.state !== NodeState.READY)
            return; // stale or pending; recalculation already scheduled, we're fine..
        this.state = NodeState.STALE;
        if (transitionTracker)
            reportTransition(this, "STALE");
        this.notifyObservers();
    }

    markReady(stateDidActuallyChange:boolean) {
        if (this.state === NodeState.READY)
            return;
        this.state = NodeState.READY;
        if (transitionTracker)
            reportTransition(this, "READY", true, this["_value"]);
        this.notifyObservers(stateDidActuallyChange);
    }

    notifyObservers(stateDidActuallyChange:boolean=false) {
        var os = this.observers.slice();
        for(var l = os.length, i = 0; i < l; i++)
            os[i].notifyStateChange(this, stateDidActuallyChange);
    }

    public notifyObserved() {
        var ts = global.__mobservableViewStack, l = ts.length;
        if (l > 0) {
            var deps = ts[l-1].observing, depslength = deps.length;
            // this last item added check is an optimization especially for array loops,
            // because an array.length read with subsequent reads from the array
            // might trigger many observed events, while just checking the latest added items is cheap
            // (n.b.: this code is inlined and not in observable view for performance reasons)
            if (deps[depslength -1] !== this && deps[depslength -2] !== this)
                deps[depslength] = this;
        }
    }

    public dispose() {
        if (this.observers.length)
            throw new Error("[mobservable] Cannot dispose DNode; it is still being observed");
        this.isDisposed = true;
    }

    public toString() {
        return `DNode[${this.context.name}, state: ${this.state}, observers: ${this.observers.length}]`;
    }
}

/**
    * A node in the state dependency root that observes other nodes, and can be observed itself.
    * Represents the state of a View.
    */
export class ViewNode extends DataNode {
    isSleeping = true; // isSleeping: nobody is observing this dependency node, so don't bother tracking DNode's this DNode depends on
    hasCycle = false;  // this node is part of a cycle, which is an error
    observing: DataNode[] = [];       // nodes we are looking at. Our value depends on these nodes
    private prevObserving: DataNode[] = null; // nodes we were looking at before. Used to determine changes in the dependency tree
    private dependencyChangeCount = 0;     // nr of nodes being observed that have received a new value. If > 0, we should recompute
    private dependencyStaleCount = 0;      // nr of nodes being observed that are currently not ready

    setRefCount(delta:number) {
        var rc = this.externalRefenceCount += delta;
        if (rc === 0)
            this.tryToSleep();
        else if (rc === delta) // a.k.a. rc was zero.
            this.wakeUp();
    }

    removeObserver(node:ViewNode) {
        super.removeObserver(node);
        this.tryToSleep();
    }

    tryToSleep() {
        if (!this.isSleeping && this.observers.length === 0 && this.externalRefenceCount === 0) {
            for (var i = 0, l = this.observing.length; i < l; i++)
                this.observing[i].removeObserver(this);
            this.observing = [];
            this.isSleeping = true;
        }
    }

    wakeUp() {
        if (this.isSleeping) {
            this.isSleeping = false;
            this.state = NodeState.PENDING;
            this.computeNextState();
        }
    }

    // the state of something we are observing has changed..
    notifyStateChange(observable:DataNode, stateDidActuallyChange:boolean) {
        if (observable.state === NodeState.STALE) {
            if (++this.dependencyStaleCount === 1)
                this.markStale();
        } else { // not stale, thus ready since pending states are not propagated
            if (stateDidActuallyChange)
                this.dependencyChangeCount += 1;
            if (--this.dependencyStaleCount === 0) { // all dependencies are ready
                this.state = NodeState.PENDING;
                // did any of the observables really change?
                if (this.dependencyChangeCount > 0)
                    this.computeNextState();
                else
                    // we're done, but didn't change, lets make sure verybody knows..
                    this.markReady(false);
                this.dependencyChangeCount = 0;
            }
        }
    }

    computeNextState() {
        this.trackDependencies();
        if (transitionTracker)
            reportTransition(this, "PENDING");
        var hasError = true;
        try {
            var stateDidChange;
            withStrict(this.externalRefenceCount === 0, () => {
                stateDidChange = this.compute();
            });
            hasError = false;
        } finally {
            if (hasError)
                // TODO: merge with computable view, use this.func.toString
                console.error(`[mobservable.view '${this.context.name}'] There was an uncaught error during the computation of ${this.toString()}`);
            // TODO: merge with computable view, so this is correct:
            (<any>this).isComputing = false
            this.bindDependencies();
            this.markReady(stateDidChange);
        }
    }

    compute():boolean {
        throw  "Abstract!";
    }

    private trackDependencies() {
        this.prevObserving = this.observing;
        this.observing = [];
        global.__mobservableViewStack[global.__mobservableViewStack.length] = this;
    }

    private bindDependencies() {
            global.__mobservableViewStack.length -= 1;

        var [added, removed] = quickDiff(this.observing, this.prevObserving);
        this.prevObserving = null;

        this.hasCycle = false;
        for(var i = 0, l = added.length; i < l; i++) {
            var dependency = added[i];
            if (dependency instanceof ViewNode && dependency.findCycle(this)) {
                this.hasCycle = true;
                // don't observe anything that caused a cycle, or we are stuck forever!
                this.observing.splice(this.observing.indexOf(added[i]), 1);
                dependency.hasCycle = true; // for completeness sake..
            } else {
                added[i].addObserver(this);
            }
        }

        // remove observers after adding them, so that they don't go in lazy mode to early
        for(var i = 0, l = removed.length; i < l; i++)
            removed[i].removeObserver(this);
    }

    private findCycle(node:DataNode) {
        var obs = this.observing;
        if (obs.indexOf(node) !== -1)
            return true;
        for(var l = obs.length, i = 0; i < l; i++)
            if (obs[i] instanceof ViewNode && (<ViewNode>obs[i]).findCycle(node))
                return true;
        return false;
    }

    public dispose() {
        if (this.observing) for(var l=this.observing.length, i=0; i<l; i++)
            this.observing[i].removeObserver(this);
        this.observing = null;
        super.dispose();
    }
}

export function stackDepth () {
    return global.__mobservableViewStack.length;
}

export function isComputingView() {
    return global.__mobservableViewStack.length > 0;
}

import {getStrict, withStrict} from './core';
import {transitionTracker, reportTransition} from './extras';
import {quickDiff} from './utils';
import {IContextInfoStruct} from './interfaces';
