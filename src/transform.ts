import {Lambda} from './interfaces';
import {ObservableView} from './observableview';
import {getDNode} from './extras';
import {once} from './utils';
import {isObservable} from './core';

export type ITransformationFunction = (object: any, recurse:(object:any) => any) => void;

// TODO: cleanup callback
// TODO: what is the effect of not returning reactive objects?
// TODO: compose different transform functions?
// TODO: how does this relate to map-reduce?

export function transform(object: any, transformer: ITransformationFunction):any /*TODO typed */ {
	const objectCache : {[id:number]: TransformationNode} = {};
	const transformStack : TransformationNode[][] = []; // TODO: stack needed? just save info on transformationNode? or make it global?
	
	// TODO: recycle DNode? it's so similar
	class TransformationNode {
		uses: TransformationNode[] = [];
		_refCount = 0;
		_disposed = false;
		
		constructor(public id: number, public source: any) { }
		
		value = new ObservableView<any>(() => {
			try {
				transformStack.unshift([]);
				return transformer(this.source, recurseTransform);
			} finally {
				const used = transformStack.shift();
				const previous = this.uses;
				this.uses = used;
				for(let i = 0, l = used.length; i < l; i++)
					used[i].refCount(+1);
				for(let i = previous.length - 1; i >= 0; i--)
					previous[i].refCount(-1);
			}
		}, this, null, false);
		
		refCount(delta) {
			if ((this._refCount += delta) === 0) {
				this.dispose();
			}
		}
		
		dispose() {
			// TODO: use dispose (or onReferencesDropToZero) of DNode to do this?
			if (this._disposed)
				return;
			this._disposed = true;
			for(let i = this.uses.length - 1; i >= 0; i--)
				this.uses[i].refCount(-1);
			this.uses = null;
			delete objectCache[this.id];
		}

		// TODO: function to transformation always make eager?
		// this.value.setRefCount(delta);
	}

	function recurseTransform(object: any): any {
		if (object === null || object === undefined)
			return object;
		const identifier = getId(object);
		if (objectCache[identifier]) {
			const n = objectCache[identifier];
			transformStack[0].push(n);
			return n.value.get();
		}
		
		const n = new TransformationNode(identifier, object);
		objectCache[identifier] = n;
		return n.value.get();
	}
	
	//recurseTransform(object);
	//const rootNode = objectCache[getId(object)];
	/*rootNode.refCount(+1); 
	return once(() => {
		rootNode.refCount(-1);
		rootNode.dispose();
	});*/
	//return rootNode;

	// TODO: if in other transform, just return recurseTransform instead of the transformationNode?
	return new TransformationNode(getId(object), object);
}

let transformId = 0;
function getId(object) {
	if (!isObservable(object))
		throw new Error("[mobservable] transform expected some observable object, got: " + object);
	var tid = object.$mobservable.transformId;
	if (tid === undefined)
		return object.$mobservable.transformId = ++transformId;
	return tid;
}