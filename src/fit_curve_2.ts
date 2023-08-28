
const MAX_ITERATIONS = 20;

namespace bezier {
	export function q(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		const tx = 1 - t,
			[a, b, c, d] = cp,
			pa = a.scale(tx * tx * tx),
			pb = b.scale(3 * tx * tx * t),
			pc = c.scale(3 * tx * t * t),
			pd = d.scale(t * t * t);
		return Vec.add(
			Vec.add(pa, pb),
			Vec.add(pc, pd),
		);
	}

	export function qprime(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		const tx = 1 - t,
			pa = Vec.sub(cp[1], cp[0]).scale(3 * tx * tx),
			pb = Vec.sub(cp[2], cp[1]).scale(6 * tx * t),
			pc = Vec.sub(cp[3], cp[2]).scale(3 * t * t);
		return Vec.add(Vec.add(pa, pb), pc);
	}

	export function qprimeprime(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		return Vec.add(
			Vec.add(
				Vec.sub(cp[2], cp[1].scale(2)),
				cp[0]
			).scale(6 * (1 - t)),
			Vec.add(
				Vec.sub(cp[3], cp[2].scale(2)),
				cp[1]
			).scale(6 * t)
		);
	}
}

export class Vec {
	public constructor(
		public readonly i: number,
		public readonly j: number,
	) { }

	static of(i: number, j: number): Vec {
		return new Vec(i, j);
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

	static zero(): Vec {
		return new Vec(0, 0);
	}

	len(): number {
		const { i, j } = this;
		return Math.sqrt(i * i + j * j);
	}

	normalize(): Vec {
		const len = this.len();
		return new Vec(this.i / len, this.j / len);
	}

	scale(s: number): Vec {
		const { i, j } = this;
		return new Vec(i * s, j * s);
	}
}

type Spline = [Vec, Vec, Vec, Vec][];

function computeTangent(
	a: Vec,
	b: Vec,
): Vec {
	const t = Vec.sub(b, a);
	return t.normalize();
}

function chordLengthParameterize(pts: Vec[]): number[] {
	const u = [0];
	for (let i = 1, n = pts.length; i < n; i++) {
		u.push(
			u[i - 1] + Vec.sub(pts[i], pts[i - 1]).len()
		);
	}
	const lu = u[u.length - 1];
	return u.map(t => t / lu);
}

function generateBezier(
	pts: Vec[],
	params: number[],
	lt: Vec,
	rt: Vec,
): [Vec, Vec, Vec, Vec] {
	const n = pts.length,
		fp = pts[0],
		lp = pts[n - 1];

	const A = params.map(
		u => {
			const ux = 1 - u;
			return [
				lt.scale(3 * u * ux * ux),
				rt.scale(3 * ux * u * u),
			];
		}
	);

	const C = A.reduce(
		(C, a) => {
			return [
				Vec.of(
					C[0].i + Vec.dot(a[0], a[0]),
					C[0].j + Vec.dot(a[0], a[1]),
				),
				Vec.of(
					C[1].i + Vec.dot(a[0], a[1]),
					C[1].j + Vec.dot(a[1], a[1]),
				),
			];
		},
		[Vec.zero(), Vec.zero()],
	);

	const X = pts.reduce(
		(X, pt, i) => {
			const u = params[i],
				a = A[i],
				t = Vec.sub(pt, bezier.q([fp, fp, lp, lp], u));
			return Vec.of(
				X.i + Vec.dot(a[0], t),
				X.j + Vec.dot(a[1], t),
			)
		},
		Vec.zero(),
	);

	// compute the determinants of C and X
	const det_C0_C1 = C[0].i * C[1].j - C[1].i * C[0].j,
		det_C0_X = C[0].i * X.j - C[1].i * X.i,
		det_X_C1 = X.i * C[1].j - X.j * C[0].j,
		alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1,
		alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1,
		segLength = Vec.sub(fp, lp).len(),
		episilon = 1.0e-6 * segLength;
	if (alpha_l < episilon || alpha_r < episilon) {
		const a = lt.scale(segLength / 3),
			b = rt.scale(segLength / 3);
		return [fp, Vec.add(fp, a), Vec.add(lp, b), lp];
	}

	const a = lt.scale(alpha_l),
		b = rt.scale(alpha_r);
	return [fp, Vec.add(fp, a), Vec.add(lp, b), lp];
}

// function findT(
// 	bez: [Vec, Vec, Vec, Vec],
// 	param: number,
// 	distMap: number[],
// 	parts: number,
// ): number {
// 	return 0;
// }

function mapTToRelativeDistances(
	bez: [Vec, Vec, Vec, Vec],
	parts: number,
): number[] {
	let len = 0,
		dists = [0],
		prev = bez[0];
	for (let i = 1; i <= parts; i++) {
		const curr = bezier.q(bez, i / parts);
		len += Vec.sub(curr, prev).len();
		dists.push(len);
		prev = curr;
	}
	// Normalize B_length to the same interval as parameter distances; 0 to 1
	return dists.map(x => x / len);
}

function findT(
	bez: [Vec, Vec, Vec, Vec],
	param: number,
	distMap: number[],
	parts: number,
): number {
	if (param < 0) {
		return 0;
	}

	if (param > 1) {
		return 1;
	}

	let t = 0;

	for (let i = 1; i < parts; i++) {
		if (param <= distMap[i]) {
			const tMin = (i - 1) / parts,
				tMax = i / parts,
				lenMin = distMap[i - 1],
				lenMax = distMap[i];
			t = (param - lenMin) / (lenMax - lenMin) * (tMax - tMin) + tMin;
			break;
		}
	}

	return t;
}

function newtonRaphsonRootFind(
	bez: [Vec, Vec, Vec, Vec],
	point: Vec,
	u: number
): number {
	const d = Vec.sub(bezier.q(bez, u), point),
		qprime = bezier.qprime(bez, u),
		numerator = Vec.dot(d, qprime),
		{ i, j } = qprime,
		denominator = (i * i + j * j) + 2 * Vec.dot(d, bezier.qprimeprime(bez, u));
	return (denominator === 0)
		? u
		: u - numerator / denominator;
}

function computeMaxError(
	pts: Vec[],
	bez: [Vec, Vec, Vec, Vec],
	params: number[],
): [number, number] {
	let splitPt = pts.length / 2,
		distMap = mapTToRelativeDistances(bez, splitPt),
		maxDist = 0;
	for (let i = 0, n = pts.length; i < n; i++) {
		const pt = pts[i],
			t = findT(bez, params[i], distMap, 10),
			v = Vec.sub(bezier.q(bez, t), pt),
			dist = v.i * v.i + v.j * v.j;
		if (dist > maxDist) {
			maxDist = dist;
			splitPt = i;
		}
	}
	return [maxDist, splitPt];
}

function fitCubic(
	pts: Vec[],
	lt: Vec,
	rt: Vec,
	error: number,
): Spline {
	if (pts.length === 2) {
		const dist = Vec.sub(pts[0], pts[1]).len() / 3,
			a = lt.scale(dist),
			b = rt.scale(dist);
		return [[pts[0], Vec.add(pts[0], a), Vec.add(pts[1], b), pts[1]]];
	}

	const u = chordLengthParameterize(pts),
		bez = generateBezier(pts, u, lt, rt),
		[maxErr, splitPt] = computeMaxError(pts, bez, u);
	if (maxErr < error) {
		return [bez];
	}

	if (maxErr < error * error) {
		let uPrime = u,
			prevErr = maxErr,
			prevSplit = splitPt;
		for (let i = 0; i < MAX_ITERATIONS; i++) {
			// uPrime = reparameterize(bez, pts, uPrime);
			const bez = generateBezier(pts, uPrime, lt, rt);
		}
	}
	console.log(u);
	return [];
}

export function fit(
	points: Vec[],
	error: number,
): Spline {
	// remove adjacent repeated points
	points = points.reduce(
		(res: Vec[], pt) => {
			if (res.length === 0) {
				return [pt];
			}

			const { i: pi, j: pj } = res[res.length - 1],
				{ i, j } = pt;
			if (i !== pi || j !== pj) {
				res.push(pt);
			}
			return res;
		},
		[]
	);

	const n = points.length,
		lt = computeTangent(points[0], points[1]),
		rt = computeTangent(points[n - 2], points[n - 1]);

	return fitCubic(points, lt, rt, error);
}