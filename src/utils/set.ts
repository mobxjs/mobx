let mapCounter = 0;

export class FastSet<T> {
	size = 0;
	data = {};

	isEmpty(): boolean {
		return this.size === 0;
	}

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
	// TODO: standardize __mapid
	add(value: any) {
		let m = value.__mapid || (value.__mapid = "#" + (++mapCounter));
		if (!(m in this.data)) {
			this.data[m] = value;
			this.size++;
		}
	}

	remove(value: any) {
		if (value.__mapid in this.data) {
			delete this.data[value.__mapid];
			this.size--;
		}
	}

	cloneAndClear(): T[] {
		const res = this.asArray();
		this.data = {};
		this.size = 0;
		return res;
	}
}