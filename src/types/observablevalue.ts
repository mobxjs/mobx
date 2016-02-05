import {Atom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/globalstate";
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped} from "./modifiers";
import {valueDidChange, Lambda} from "../utils/utils";
import {ComputedValue} from "../core/computedvalue";
import {observe} from "../api/observe";

export class ObservableValue<T> {
	atom: Atom;
	hasUnreportedChange = false;

	protected value: T = undefined;

	constructor(value: T, protected mode: ValueMode, public name?: string) {
		this.atom = new Atom(name);
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
	}

	set(newValue: T): boolean {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		// TODO: check if derived value is running (not reactor)
		checkIfStateModificationsAreAllowed();
		const oldValue = this.value;
		const changed = valueDidChange(this.mode === ValueMode.Structure, oldValue, newValue);
		if (changed) {
			this.value = makeChildObservable(newValue, this.mode, this.name);
			this.atom.reportChanged();
		}
		return changed;
	}

	get(): T {
		this.atom.reportObserved();
		return this.value;
	}

	toString() {
		return `ObservableValue[${this.name}:${this.value}]`;
	}
}

// TODO: deprecate?
export interface IObservableValue<T> {
	(): T;
	(value: T): void;
}

// TODO: deprecate?
export function toGetterSetterFunction<T>(observable: ObservableValue<T> | ComputedValue<T>): IObservableValue<T> {
	const f: any = function(value?) {
		if (arguments.length > 0)
			observable.set(value);
		else
			return observable.get();
	};
	f.$mobservable = observable;
	f.toString = function() {
		return observable.toString();
	};
	return f;
}
