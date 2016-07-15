
export class Set<T> {
	data = new global.Set();

	// TODO: faster if not using getter?
	get length(): number {
		return this.data.size;
	}

	asArray(): T[] {
		const res = [];
		const iter = this.data.values();
		let v = iter.next();
		while (!v.done) {
			res.push(v.value);
			v = iter.next();
		}
		return res;
	}

	/**
	 * @param {T} value
	 * @returns {number} new length
	 */
	add(value: T) {
		this.data.add(value);
	}

	remove(value: T) {
		this.data.delete(value);
	}

	cloneAndClear(): T[] {
		const res = this.asArray();
		this.data.clear();
		return res;
	}
}