import {Atom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";
import {ValueMode, getValueModeFromValue, makeChildObservable, assertUnwrapped} from "./modifiers";
import {valueDidChange, Lambda} from "../utils/utils";
import {hasInterceptors, IInterceptable, IInterceptor, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd, spyReport} from "../core/spy";
import {getNextId} from "../core/globalstate";

export interface IValueWillChange<T> {
	object: any;
	type: "update";
	newValue: T;
}

// Introduce in 3.0
// export interface IValueDidChange<T> {
// 	object: any;
// 	type: "update" | "create";
// 	newValue: T;
// 	oldValue: T;
// }

export type IUNCHANGED = {};

export const UNCHANGED: IUNCHANGED = {};

export class ObservableValue<T> extends Atom implements IInterceptable<IValueWillChange<T>>, IListenable {
	hasUnreportedChange = false;
	interceptors;
	changeListeners;
	protected value: T = undefined;

	constructor(value: T, protected mode: ValueMode, name = "ObservableValue@" + getNextId(), notifySpy = true) {
		super(name);
		const [childmode, unwrappedValue] = getValueModeFromValue(value, ValueMode.Recursive);
		// If the value mode is recursive, modifiers like 'structure', 'reference', or 'flat' could apply
		if (this.mode === ValueMode.Recursive)
			this.mode = childmode;
		this.value = makeChildObservable(unwrappedValue, this.mode, this.name);
		if (notifySpy && isSpyEnabled()) {
			// only notify spy if this is a stand-alone observable
			spyReport({ type: "create", object: this, newValue: this.value });
		}
	}

	set(newValue: T) {
		const oldValue = this.value;
		newValue = this.prepareNewValue(newValue) as any;
		if (newValue !== UNCHANGED) {
			const notifySpy = isSpyEnabled();
			if (notifySpy) {
				spyReportStart({
					type: "update",
					object: this,
					newValue, oldValue
				});
			}
			this.setNewValue(newValue);
			if (notifySpy)
				spyReportEnd();
		}
	}

	prepareNewValue(newValue): T | IUNCHANGED {
		assertUnwrapped(newValue, "Modifiers cannot be used on non-initial values.");
		checkIfStateModificationsAreAllowed();
		if (hasInterceptors(this)) {
			const change = interceptChange<IValueWillChange<T>>(this, { object: this, type: "update", newValue });
			if (!change)
				return UNCHANGED;
			newValue = change.newValue;
		}
		const changed = valueDidChange(this.mode === ValueMode.Structure, this.value, newValue);
		if (changed)
			return makeChildObservable(newValue, this.mode, this.name);
		return UNCHANGED;
	}

	setNewValue(newValue: T) {
		const oldValue = this.value;
		this.value = newValue;
		this.reportChanged();
		if (hasListeners(this))
			notifyListeners(this, [newValue, oldValue]); // in 3.0, use an object instead!
	}

	get(): T {
		this.reportObserved();
		return this.value;
	}

	intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda {
		return registerInterceptor(this, handler);
	}

	observe(listener: (newValue: T, oldValue: T) => void, fireImmediately?: boolean): Lambda {
		if (fireImmediately)
			listener(this.value, undefined);
		return registerListener(this, listener);
	}

	toString() {
		return `${this.name}[${this.value}]`;
	}
}
