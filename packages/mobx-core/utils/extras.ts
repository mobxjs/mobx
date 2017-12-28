import { IDepTreeNode, getObservers, hasObservers, IObservable } from "../core/observable"
import { unique } from "../utils/utils"
import { IDerivation } from "../core/derivation";

export interface IDependencyTree {
    name: string
    dependencies?: IDependencyTree[]
}

export interface IObserverTree {
    name: string
    observers?: IObserverTree[]
}

export function getDependencyTree(thing: IObservable): IDependencyTree {
    return nodeToDependencyTree(thing)
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
    const result: IDependencyTree = {
        name: node.name
    }
    if (node.observing && node.observing.length > 0)
        result.dependencies = unique(node.observing).map(nodeToDependencyTree)
    return result
}

export function getObserverTree(thing: IDerivation): IObserverTree {
    return nodeToObserverTree(thing)
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
    const result: IObserverTree = {
        name: node.name
    }
    if (hasObservers(node as any))
        result.observers = <any>getObservers(node as any).map(<any>nodeToObserverTree)
    return result
}
