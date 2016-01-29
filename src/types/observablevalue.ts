import Atom from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/global";
import {IDerivation} from "../core/derivation";
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped, valueDidChange} from '../core';
import {Lambda} from "../interfaces";
import {autorun} from "../core";

export default class ObservableValue<T> {
	atom: Atom;
	hasUnreportedChange = false;

	protected value: T = undefined;
	
	constructor(value:T, protected mode:ValueMode, public name?: string){
		this.atom = new Atom(name);
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
	}

	set(newValue:T):boolean {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		// TODO: check if derived value is running (not reactor)
		checkIfStateModificationsAreAllowed();
		var oldValue = this.value;
		const changed = valueDidChange(this.mode === ValueMode.Structure, oldValue, newValue);
		if (changed) {
			this.value = makeChildObservable(newValue, this.mode, this.name);
            this.atom.reportChanged();
		}
		return changed;
	}
	
	get():T {
		this.atom.reportObserved();
		return this.value;
	}
	
	toString() {
		return `ObservableValue[${this.name}:${this.value}]`;
	}
	
	// TODO: remove
	observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
		let firstTime = true;
		let prevValue = undefined;
		return autorun(() => {
			var newValue = this.get();
			if (!firstTime || fireImmediately) {
				listener(newValue, prevValue);
			}
			firstTime = false;
			prevValue = newValue;
		});
	}
}