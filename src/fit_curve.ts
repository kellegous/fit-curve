import { Vec } from "./vec";
import { bezier } from "./bezier";

// TODO(knorton): iterations should be a part of the options that are passed in.
const MaxIterations = 20;

export type Bezier = [Vec, Vec, Vec, Vec];

function computeTangent(a: Vec, b: Vec) {
	return Vec.sub(a, b).normalize();
}

function filterDuplicates(pts: Vec[]): Vec[] {
	return pts.reduce(
		(res: Vec[], pt: Vec) => {
			if (res.length == 0) {
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
}

function chordLengthParameterize(pts: Vec[]): number[] {
	const u = [0];
	for (let i = 1, n = pts.length; i < n; i++) {
		const cu = u[i - 1] + Vec.sub(pts[i], pts[i - 1]).length();
		u.push(cu);
	}
	const lu = u[u.length - 1];
	return u.map((x: number) => {
		return x / lu;
	});
}

function generateBezier(
	pts: Vec[],
	params: number[],
	lt: Vec,
	rt: Vec
): Bezier {
	const n = pts.length,
		fp = pts[0],
		lp = pts[n - 1];

	let A: [Vec, Vec][] = [];
	for (let i = 0, n = params.length; i < n; i++) {
		let u = params[i],
			ux = 1 - u;
		A.push(
			[
				lt.scale(3 * u * (ux * ux)),
				rt.scale(3 * ux * (u * u))
			]
		);
	}

	let C = [[0, 0], [0, 0]];
	let X = [0, 0];

	for (let i = 0, n = pts.length; i < n; i++) {
		let u = params[i],
			a = A[i];

		C[0][0] += Vec.dot(a[0], a[0]);
		C[0][1] += Vec.dot(a[0], a[1]);
		C[1][0] += Vec.dot(a[0], a[1]);
		C[1][1] += Vec.dot(a[1], a[1]);

		let tmp = Vec.sub(
			pts[i],
			bezier.q([fp, fp, lp, lp], u)
		);

		X[0] += Vec.dot(a[0], tmp);
		X[1] += Vec.dot(a[1], tmp);
	}

	// Compute the determinants of C and X
	const det_C0_C1 = (C[0][0] * C[1][1]) - (C[1][0] * C[0][1]),
		det_C0_X = (C[0][0] * X[1]) - (C[1][0] * X[0]),
		det_X_C1 = (X[0] * C[1][1]) - (X[1] * C[0][1]);

	// Finally, derive alpha values
	const alpha_l = det_C0_C1 === 0
		? 0
		: det_X_C1 / det_C0_C1;
	const alpha_r = det_C0_C1 === 0
		? 0
		: det_C0_X / det_C0_C1;

	// If alpha is negative, use the Wu/Barsky heuristic (see text).
	// If alpha is zero, you get coincident control points that lead to
	// divide by zero in any subsequant NewRaphsonRootFind call.
	const segLen = Vec.sub(fp, lp).length(),
		epsilon = 1.0e-6 * segLen;
	if (alpha_l < epsilon || alpha_r < epsilon) {
		const a = lt.scale(segLen / 3.0),
			b = rt.scale(segLen / 3.0);
		return [fp, Vec.add(fp, a), Vec.add(lp, b), lp];
	}

	const a = lt.scale(alpha_l),
		b = rt.scale(alpha_r);
	return [fp, Vec.add(fp, a), Vec.add(lp, b), lp];
}

function computeMaxError(
	pts: Vec[],
	bez: Bezier,
	params: number[]
): [number, number] {
	let maxDist = 0,
		splitPt = pts.length / 2,
		distMap = mapTToRelativeDistances(bez, 10);

	for (let i = 0, n = pts.length; i < n; i++) {
		let pt = pts[i],
			t = findT(params[i], distMap, 10),
			v = Vec.sub(bezier.q(bez, t), pt),
			dist = v.i * v.i + v.j * v.j;

		if (dist > maxDist) {
			maxDist = dist;
			splitPt = i;
		}

	}

	return [maxDist, splitPt];
}

function findT(
	param: number,
	distMap: number[],
	parts: number
): number {
	if (param < 0) {
		return 0;
	}

	if (param > 1) {
		return 1;
	}

	let t = 0,
		tMin: number,
		tMax: number,
		lenMin: number,
		lenMax: number;

	for (let i = 1; i <= parts; i++) {
		if (param <= distMap[i]) {
			tMin = (i - 1) / parts;
			tMax = i / parts;
			lenMin = distMap[i - 1];
			lenMax = distMap[i];

			t = (param - lenMin) / (lenMax - lenMin) * (tMax - tMin) + tMin;
			break;
		}
	}

	return t;
}

function mapTToRelativeDistances(
	bez: Bezier,
	parts: number
): number[] {
	let len = 0,
		dists = [0],
		prev = bez[0];
	for (let i = 1; i <= parts; i++) {
		let curr = bezier.q(bez, i / parts);
		len += Vec.sub(curr, prev).length();
		dists.push(len);
		prev = curr;
	}
	// Normalize B_length to the same interval as parameter distances; 0 to 1
	return dists.map(x => x / len);
}

function fitCubic(
	pts: Vec[],
	lt: Vec,
	rt: Vec,
	err: number
): Bezier[] {
	if (pts.length == 2) {
		let dist = Vec.sub(pts[0], pts[1]).length() / 3.0,
			a = lt.scale(dist),
			b = rt.scale(dist);
		return [
			[
				pts[0],
				Vec.add(pts[0], a),
				Vec.add(pts[1], b),
				pts[1]
			]
		];
	}

	let u = chordLengthParameterize(pts),
		bez = generateBezier(pts, u, lt, rt),
		[maxErr, splitPt] = computeMaxError(pts, bez, u);

	if (maxErr < err) {
		return [bez];
	}

	// If error not too large, try some reparameterization and iterator
	if (maxErr < (err * err)) {
		let uPrime = u,
			prevErr = maxErr,
			prevSplitPt = splitPt;
		for (let i = 0; i < MaxIterations; i++) {
			uPrime = reparameterize(bez, pts, uPrime);
			bez = generateBezier(pts, uPrime, lt, rt);
			[maxErr, splitPt] = computeMaxError(pts, bez, u);

			if (maxErr < err) {
				return [bez];
			} else if (splitPt == prevSplitPt) {
				let errChange = maxErr / prevErr;
				if ((errChange > 0.9999) && (errChange < 1.0001)) {
					break;
				}
			}

			prevErr = maxErr;
			prevSplitPt = splitPt;
		}
	}

	// Fitting failed: split at max error point and fit recursively

	// To create a smooth transition from one curve segment to the next,
	// we calculate the tangent of the points directly before and after the center,
	// and use that same segment both to and from the center point.
	let centerVec = Vec.sub(pts[splitPt - 1], pts[splitPt + 1]);

	if ((centerVec.i === 0) && centerVec.j === 0) {
		let { i: x, j: y } = Vec.sub(pts[splitPt - 1], pts[splitPt]);
		centerVec = Vec.of(-y, x);
	}

	let toCenterTan = centerVec.normalize(),
		frCenterTan = toCenterTan.scale(-1);

	let a = fitCubic(pts.slice(0, splitPt + 1), lt, toCenterTan, err),
		b = fitCubic(pts.slice(splitPt), frCenterTan, rt, err);
	return a.concat(b);
}

function reparameterize(
	bez: Bezier,
	pts: Vec[],
	params: number[]
): number[] {
	return params.map(
		(p: number, i: number) => {
			return newtonRaphsonRootFind(bez, pts[i], p);
		}
	);
}

function newtonRaphsonRootFind(
	bez: Bezier,
	pt: Vec,
	u: number
): number {
	const d = Vec.sub(bezier.q(bez, u), pt),
		qprime = bezier.qprime(bez, u),
		{ i: x, j: y } = qprime,
		numerator = Vec.dot(d, qprime),
		denominator = (x * x + y * y) + 2 * Vec.dot(d, bezier.qprimeprime(bez, u));
	return (denominator === 0)
		? u
		: u - (numerator / denominator);
}

export function fit(
	pts: Vec[],
	err: number
): Bezier[] {
	pts = filterDuplicates(pts);
	if (pts.length < 2) {
		return [];
	}
	const n = pts.length,
		lt = computeTangent(pts[1], pts[0]),
		rt = computeTangent(pts[n - 2], pts[n - 1]);
	return fitCubic(pts, lt, rt, err);
}
