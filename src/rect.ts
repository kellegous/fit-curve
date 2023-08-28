import { Vec } from "./vec";

export class Rect {
	constructor(
		public readonly tl: Vec,
		public readonly br: Vec,
	) {
	}

	origin(): Vec {
		return this.tl;
	}

	size(): Vec {
		const { tl, br } = this;
		return Vec.sub(br, tl);
	}

	static fromXYWH(x: number, y: number, w: number, h: number): Rect {
		return new this(Vec.of(x, y), Vec.of(x + w, y + h));
	}

	static boundsOf(pts: Iterable<Vec>): Rect {
		let tl = Vec.of(Number.MAX_VALUE, Number.MAX_VALUE);
		for (const pt of pts) {
			tl = Vec.of(Math.min(tl.i, pt.i), Math.min(tl.j, pt.j));
		}

		let br = Vec.of(Number.MIN_VALUE, Number.MIN_VALUE);
		for (const pt of pts) {
			br = Vec.of(Math.max(br.i, pt.i), Math.max(br.j, pt.j));
		}

		return new this(tl, br);
	}
}