
export class Set<T> {
	data = [];

	// TODO: faster if not using getter?
	get length(): number {
		return this.data.length;
	}

	asArray(): T[] {
		return this.data.slice();
	}

	/**
	 * @param {T} value
	 * @returns {number} new length
	 */
	add(value: T) {
		const idx = this.data.indexOf(value);
		if (idx === -1)
			this.data.push(value);
	}

	remove(value: T) {
		const idx = this.data.indexOf(value);
		if (idx !== -1)
			this.data.splice(idx, 1);
	}

	cloneAndClear(): T[] {
		return this.data.splice(0);
	}
}