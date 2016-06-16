import {once, Lambda, deprecated} from "./utils";

export type ISimpleEventListener = {(...data: any[]): void}

export class SimpleEventEmitter {
	listeners: ISimpleEventListener[] = [];

	constructor() {
		deprecated("extras.SimpleEventEmitter is deprecated and will be removed in the next major release");
	}

	emit(...data: any[]);
	emit() {
		const listeners = this.listeners.slice();
		for (let i = 0, l = listeners.length; i < l; i++)
			listeners[i](...arguments);
	}

	on(listener: ISimpleEventListener): Lambda {
		this.listeners.push(listener);
		return once(() => {
			const idx = this.listeners.indexOf(listener);
			if (idx !== -1)
				this.listeners.splice(idx, 1);
		});
	}

	once(listener: ISimpleEventListener): Lambda {
		const subscription = this.on(function() {
			subscription();
			listener.apply(this, arguments);
		});
		return subscription;
	}
}