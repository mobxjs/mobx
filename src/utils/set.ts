export interface ISetEntry {
	__mapid: string;
}

// ... cause .Set is not available in all browsers..
export class SimpleSet<T extends ISetEntry> {
	size = 0;
	data = {};

	get length() {
		return this.size;
	}

	asArray(): T[] {
		const res = new Array(this.size);
		let i = 0;
		for (let key in this.data) {
			res[i] = this.data[key];
			i++;
		}
		return res;
	}

	/**
	 * @param {T} value
	 * @returns {number} new length
	 */
	add(value: T) {
		let m = value.__mapid;
		if (!(m in this.data)) {
			this.data[m] = value;
			this.size++;
		}
	}

	remove(value: T) {
		if (value.__mapid in this.data) {
			delete this.data[value.__mapid];
			this.size--;
		}
	}
}