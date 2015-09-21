/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

namespace mobservable {
	export namespace _ {
		export function getDNode(thing:any, property?:string):DataNode {
			if (!isReactive(thing))
				throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
			if (property !== undefined) {
				var o = <ObservableObject> thing.$mobservable;
				var dnode = o.values && o.values[property]
				if (!dnode)
					throw new Error(`[mobservable.getDNode] property '${property}' of '${thing}' doesn't seem to be a reactive property`);
				return dnode;
			}
			if (thing.$mobservable) {
				if (thing.$mobservable instanceof ObservableObject)
					throw new Error(`[mobservable.getDNode] missing properties parameter. Please specify a property of '${thing}'.`);
				return thing.$mobservable;
			}
			throw new Error(`[mobservable.getDNode] ${thing} doesn't seem to be reactive`);
		}

		export function reportTransition(node:DataNode, state:string, changed:boolean = false, newValue = null) {
			transitionTracker.emit({
				id: node.id,
				name: node.context.name,
				context: node.context.object,
				state: state,
				changed: changed,
				newValue: newValue
			});
		}

		export var transitionTracker:SimpleEventEmitter = null;
	}

	export namespace extras {
		export function getDependencyTree(thing:any, property?:string): Mobservable.IDependencyTree {
			return nodeToDependencyTree(_.getDNode(thing, property));
		}

		function nodeToDependencyTree(node:_.DataNode): Mobservable.IDependencyTree {
			var result:Mobservable.IDependencyTree = {
				id: node.id,
				name: node.context.name,
				context: node.context.object || null
			};
			if (node instanceof _.ViewNode && node.observing.length)
				result.dependencies = _.unique(node.observing).map(nodeToDependencyTree);
			return result;
		}

		export function getObserverTree(thing:any, property?:string): Mobservable.IObserverTree {
			return nodeToObserverTree(_.getDNode(thing, property));
		}

		function nodeToObserverTree(node:_.DataNode): Mobservable.IObserverTree {
			var result:Mobservable.IObserverTree = {
				id: node.id,
				name: node.context.name,
				context: node.context.object || null
			};
			if (node.observers.length)
				result.observers = _.unique(node.observers).map(nodeToObserverTree);
			if (node.externalRefenceCount > 0)
				result.listeners =  node.externalRefenceCount;
			return result;
		}

		function createConsoleReporter(extensive:boolean) {
			var lines:Mobservable.ITransitionEvent[] = [];
			var scheduled = false;

			return (line:Mobservable.ITransitionEvent) => {
				if (extensive || line.changed)
					lines.push(line);
				if (!scheduled) {
					scheduled = true;
					setTimeout(() => {
						console[console["table"] ? "table" : "dir"](lines);
						lines = [];
						scheduled = false;
					}, 1);
				}
			}
		}

		export function trackTransitions(extensive=false, onReport?:(lines:Mobservable.ITransitionEvent) => void) : Mobservable.Lambda {
			if (!_.transitionTracker)
				_.transitionTracker = new _.SimpleEventEmitter();

			const reporter = onReport
				? 	(line: Mobservable.ITransitionEvent) => {
						if (extensive || line.changed)
							onReport(line);
					}
				: 	createConsoleReporter(extensive);
			const disposer = _.transitionTracker.on(reporter);

			return _.once(() => {
				disposer();
				if (_.transitionTracker.listeners.length === 0)
					_.transitionTracker = null;
			});
		}

	}
}