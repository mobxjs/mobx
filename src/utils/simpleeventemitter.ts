/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {once, Lambda} from "./utils";

// TODO: make generic
export default class SimpleEventEmitter {
	listeners:{(...data: any[]): void}[] = [];

	emit(...data: any[]);
	emit() {
		const listeners = this.listeners.slice();
		const l = listeners.length;
		// TODO: remove switch optimization?
		switch (arguments.length) {
			case 0:
				for (let i = 0; i < l; i++)
					listeners[i]();
				break;
			case 1:
				const data = arguments[0];
				for (let i = 0; i < l; i++)
					listeners[i](data);
				break;
			default:
				for (let i = 0; i < l; i++)
					listeners[i].apply(null, arguments);
		}
	}

	on(listener: (...data: any[]) => void): Lambda {
		this.listeners.push(listener);
		return once(() => {
			const idx = this.listeners.indexOf(listener);
			if (idx !== -1)
				this.listeners.splice(idx, 1);
		});
	}

	once(listener: (...data: any[]) => void): Lambda {
		const subscription = this.on(function() {
			subscription();
			listener.apply(this, arguments);
		});
		return subscription;
	}
}