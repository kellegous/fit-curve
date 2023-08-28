export namespace vec {
	export type of2 = [number, number];

	export function len(v: of2): number {
		let [i, j] = v;
		return Math.sqrt(i * i + j * j);
	}

	export function normalize(
		dst: of2,
		src: of2
	): of2 {
		let [i, j] = src,
			n = len(src);
		dst[0] = i / n;
		dst[1] = j / n;
		return dst;
	}

	export function scale(
		dst: of2,
		src: of2,
		f: number
	): of2 {
		dst[0] = src[0] * f;
		dst[1] = src[1] * f;
		return dst;
	}

	export function sub(
		dst: of2,
		a: of2,
		b: of2
	): of2 {
		dst[0] = a[0] - b[0];
		dst[1] = a[1] - b[1];
		return dst;
	}

	export function add(
		dst: of2,
		a: of2,
		b: of2
	): of2 {
		dst[0] = a[0] + b[0];
		dst[1] = a[1] + b[1];
		return dst;
	}

	export function zeros(n: number): of2[] {
		let res: of2[] = [];
		while (n--) {
			res.push([0, 0]);
		}
		return res;
	}

	export function dot(a: of2, b: of2): number {
		return a[0] * b[0] + a[1] * b[1];
	}
}