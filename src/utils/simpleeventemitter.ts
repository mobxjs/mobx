/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
import {once, Lambda} from "./utils";

export class SimpleEventEmitter {
	listeners:{(...data: any[]): void}[] = [];

	emit(...data: any[]);
	emit() {
		const listeners = this.listeners.slice();
		for (let i = 0, l = listeners.length; i < l; i++)
			listeners[i].apply(null, arguments);
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