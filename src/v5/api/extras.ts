import { IDepTreeNode, getAtom, getObservers, hasObservers, unique } from "../internal"

export interface IDependencyTree {
    name: string
    dependencies?: IDependencyTree[]
}

export interface IObserverTree {
    name: string
    observers?: IObserverTree[]
}

export function getDependencyTree(thing: any, property?: string): IDependencyTree {
    return nodeToDependencyTree(getAtom(thing, property))
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
    const result: IDependencyTree = {
        name: node.name
    }
    if (node.observing && node.observing.length > 0)
        result.dependencies = unique(node.observing).map(nodeToDependencyTree)
    return result
}

export function getObserverTree(thing: any, property?: string): IObserverTree {
    return nodeToObserverTree(getAtom(thing, property))
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
    const result: IObserverTree = {
        name: node.name
    }
    if (hasObservers(node as any))
        result.observers = Array.from(<any>getObservers(node as any)).map(<any>nodeToObserverTree)
    return result
}
