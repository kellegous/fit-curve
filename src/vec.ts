export class Vec {
	constructor(
		public readonly i: number,
		public readonly j: number,
	) { }

	length(): number {
		const { i, j } = this;
		return Math.sqrt(i * i + j * j);
	}

	normalize(): Vec {
		const len = this.length();
		return new Vec(this.i / len, this.j / len);
	}

	scale(f: number): Vec {
		const { i, j } = this;
		return new Vec(i * f, j * f);
	}

	abs(): Vec {
		const { i, j } = this;
		return new Vec(Math.abs(i), Math.abs(j));
	}

	static mul(a: Vec, b: Vec): Vec {
		return Vec.of(a.i * b.i, a.j * b.j);
	}

	static div(a: Vec, b: Vec): Vec {
		return Vec.of(a.i / b.i, a.j / b.j);
	}

	static sub(a: Vec, b: Vec): Vec {
		return new Vec(a.i - b.i, a.j - b.j);
	}

	static add(a: Vec, b: Vec): Vec {
		return new Vec(a.i + b.i, a.j + b.j);
	}

	static dot(a: Vec, b: Vec): number {
		return a.i * b.i + a.j * b.j;
	}

	static of(i: number, j: number): Vec {
		return new Vec(i, j);
	}

	static zero(): Vec {
		return new Vec(0, 0);
	}
}