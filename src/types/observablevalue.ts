import {BaseAtom} from "../core/atom";
import {checkIfStateModificationsAreAllowed} from "../core/derivation";
import {Lambda, getNextId, createInstanceofPredicate} from "../utils/utils";
import {hasInterceptors, IInterceptable, IInterceptor, registerInterceptor, interceptChange} from "./intercept-utils";
import {IListenable, registerListener, hasListeners, notifyListeners} from "./listen-utils";
import {isSpyEnabled, spyReportStart, spyReportEnd, spyReport} from "../core/spy";
import {IEnhancer} from "../types/modifiers";

export interface IValueWillChange<T> {
	object: any;
	type: "update";
	newValue: T;
}

export interface IValueDidChange<T> extends IValueWillChange<T> {
	oldValue: T | undefined;
}

export type IUNCHANGED = {};

export const UNCHANGED: IUNCHANGED = {};

export interface IObservableValue<T> {
	get(): T;
	set(value: T): void;
	intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda;
	observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
}

export class ObservableValue<T> extends BaseAtom implements IObservableValue<T>, IInterceptable<IValueWillChange<T>>, IListenable {
	hasUnreportedChange = false;
	interceptors;
	changeListeners;
	protected value;

	constructor(value: T, protected enhancer: IEnhancer<T>, name = "ObservableValue@" + getNextId(), notifySpy = true) {
		super(name);
		this.value = enhancer(value, undefined, name);
		if (notifySpy && isSpyEnabled()) {
			// only notify spy if this is a stand-alone observable
			spyReport({ type: "create", object: this, newValue: this.value });
		}
	}

	public set(newValue: T) {
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

	private prepareNewValue(newValue): T | IUNCHANGED {
		checkIfStateModificationsAreAllowed();
		if (hasInterceptors(this)) {
			const change = interceptChange<IValueWillChange<T>>(this, { object: this, type: "update", newValue });
			if (!change)
				return UNCHANGED;
			newValue = change.newValue;
		}
		// apply modifier
		newValue = this.enhancer(newValue, this.value, this.name);
		return this.value !== newValue
			? newValue
			: UNCHANGED
		;
	}

	setNewValue(newValue: T) {
		const oldValue = this.value;
		this.value = newValue;
		this.reportChanged();
		if (hasListeners(this)) {
			notifyListeners(this, {
				type: "update",
				object: this,
				newValue,
				oldValue
			});
		}
	}

	public get(): T {
		this.reportObserved();
		return this.value;
	}

	public intercept(handler: IInterceptor<IValueWillChange<T>>): Lambda {
		return registerInterceptor(this, handler);
	}

	public observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda {
		if (fireImmediately)
			listener({
				object: this,
				type: "update",
				newValue: this.value,
				oldValue: undefined
			});
		return registerListener(this, listener);
	}

	toJSON() {
		return this.get();
	}

	toString() {
		return `${this.name}[${this.value}]`;
	}
}

export const isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue);
