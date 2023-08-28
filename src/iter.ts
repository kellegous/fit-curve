function* enumerate<T>(
	iter: Iterable<T>,
): Iterable<[number, T]> {
	let i = 0;
	for (const v of iter) {
		yield [i, v];
		i++;
	}
}

function* map<T, V, S>(
	iter: Iterable<T>,
	fn: (t: T, i?: number, s?: S) => V,
	state?: S
): Iterable<V> {
	for (const [i, v] of enumerate(iter)) {
		yield fn(v, i, state);
	}
}

function* filter<T>(
	iter: Iterable<T>,
	fn: (t: T, i?: number) => boolean,
): Iterable<T> {
	for (const [i, v] of enumerate(iter)) {
		if (fn(v, i)) {
			yield v;
		}
	}
}

export class Iter<T> implements Iterable<T>{
	private constructor(
		private iter: Iterable<T>
	) {
	}

	static of<T>(iter: Iterable<T>): Iter<T> {
		return new Iter(iter);
	}

	[Symbol.iterator]() {
		return this.iter[Symbol.iterator]();
	}

	map<V, S>(
		fn: (t: T, i?: number, state?: S) => V,
		state?: S,
	): Iter<V> {
		return new Iter(map(this.iter, fn, state));
	}

	filter(fn: (t: T, i?: number) => boolean): Iter<T> {
		return new Iter(filter(this.iter, fn));
	}

	forEach(fn: (t: T, i?: number) => void): Iter<T> {
		for (const [i, v] of enumerate(this.iter)) {
			fn(v, i);
		}
		return this;
	}

	reduce<V>(
		fn: (v: V, t: T, i?: number) => V,
		val: V,
	): V {
		for (let [i, v] of enumerate(this.iter)) {
			val = fn(val, v, i);
		}
		return val;
	}

	collect(): T[] {
		return Array.from(this.iter);
	}
}