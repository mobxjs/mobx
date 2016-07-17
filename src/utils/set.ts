declare var Set;

export class FastSet<T> {
	data = new Set();

	// TODO: faster if not using getter?
	get length(): number {
		return this.data.size;
	}

	asArray(): T[] {
		const res = new Array(this.data.size);
		const iter = this.data.values();
		let i = -1;
		let v = iter.next();
		while (!v.done) {
			res[++i] = v.value;
			v = iter.next();
		}
		return res;
	}

	// TODO: factor out forEaches?
	forEach(fn: (v: T) => void) {
		const iter = this.data.values();
		let v = iter.next();
		while (!v.done) {
			fn(v.value);
			v = iter.next();
		}
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

	cloneAndClear(): FastSet<T> {
		const res = this.data;
		this.data = new Set();
		return res;
	}

	cloneAsArrayAndClear(): T[] {
		const res = this.asArray();
		this.data.clear();
		return res;
	}

}