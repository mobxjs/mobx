import {Atom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/globalstate";
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped} from "./modifiers";
import {valueDidChange, deprecated, Lambda} from "../utils/utils";
import {observe} from "../api/observe";

export class ObservableValue<T> extends Atom {
	hasUnreportedChange = false;

	protected value: T = undefined;

	constructor(value: T, protected mode: ValueMode, name = "ObservableValue") {
		super(name);
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
	}

	set(newValue: T): boolean {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		checkIfStateModificationsAreAllowed();
		const oldValue = this.value;
		const changed = valueDidChange(this.mode === ValueMode.Structure, oldValue, newValue);
		if (changed) {
			this.value = makeChildObservable(newValue, this.mode, this.name);
			this.reportChanged();
		}
		return changed;
	}

	get(): T {
		this.reportObserved();
		return this.value;
	}

	observe(listener, fireImmediately?) {
		deprecated("Use 'mobservable.observe(value, listener)' instead.");
		return observe(this, listener, fireImmediately);
	}

	toString() {
		return `${this.name}@${this.id}[${this.value}]`;
	}
}