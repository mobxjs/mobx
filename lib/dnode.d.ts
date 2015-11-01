export declare function checkIfStateIsBeingModifiedDuringView(context: IContextInfoStruct): void;
/**
    * The state of some node in the dependency tree that is created for all views.
    */
export declare enum NodeState {
    STALE = 0,
    PENDING = 1,
    READY = 2,
}
/**
    * A root node in the dependency graph. This node can be observed by others, but doesn't observe anything itself.
    * These nodes are used to store 'state'.
    */
export declare class DataNode {
    id: number;
    state: NodeState;
    observers: ViewNode[];
    protected isDisposed: boolean;
    externalRefenceCount: number;
    context: IContextInfoStruct;
    constructor(context: IContextInfoStruct);
    setRefCount(delta: number): void;
    addObserver(node: ViewNode): void;
    removeObserver(node: ViewNode): void;
    markStale(): void;
    markReady(stateDidActuallyChange: boolean): void;
    notifyObservers(stateDidActuallyChange?: boolean): void;
    notifyObserved(): void;
    dispose(): void;
    toString(): string;
}
/**
    * A node in the state dependency root that observes other nodes, and can be observed itself.
    * Represents the state of a View.
    */
export declare class ViewNode extends DataNode {
    isSleeping: boolean;
    hasCycle: boolean;
    observing: DataNode[];
    private prevObserving;
    private dependencyChangeCount;
    private dependencyStaleCount;
    setRefCount(delta: number): void;
    removeObserver(node: ViewNode): void;
    tryToSleep(): void;
    wakeUp(): void;
    notifyStateChange(observable: DataNode, stateDidActuallyChange: boolean): void;
    computeNextState(): void;
    compute(): boolean;
    private trackDependencies();
    private bindDependencies();
    private findCycle(node);
    dispose(): void;
}
export declare function stackDepth(): number;
export declare function isComputingView(): boolean;
import { IContextInfoStruct } from './interfaces';
