import {Lambda} from './interfaces';
import {ObservableView} from './observableview';
import {getDNode} from './extras';
import {once} from './utils';
import {isObservable} from './core';

export type ITransformationFunction = (object: any, recurse:(object:any) => any) => void;

// TODO: cleanup callback
// TODO: what is the effect of not returning reactive objects?

export function transform(object: any, transformer: ITransformationFunction):any /*TODO typed */ {
	const objectCache : {[id:number]: TransformationNode} = {};
	const transformStack : TransformationNode[][] = [];
	
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
				for(let i = 0, l = used.length; i < l; i++)
					used[i].refCount(+1);
				for(let i = this.uses.length - 1; i >= 0; i--)
					this.uses[i].refCount(-1);
				this.uses = used;
			}
		}, this, null, false);
		
		refCount(delta) {
			if ((this._refCount += delta) === 0) {
				this.dispose();
			}
		}
		
		dispose() {
			if (this._disposed)
				return;
			this._disposed = true;
			for(let i = this.uses.length - 1; i >= 0; i--)
				this.uses[i].refCount(-1);
			this.uses = null;
			delete objectCache[this.id];
		}
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