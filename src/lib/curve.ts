import { vec } from './vec';

const MaxIterations = 20;

export type Pt = [number, number];
export type Bezier = [Pt, Pt, Pt, Pt];

namespace bezier {
	// Evaluates cubic curve at t, returns point.
	export function q(cp: Bezier, t: number): Pt {
		let tx = 1 - t;
		let [a, b, c, d] = cp;
		let pa = vec.scale([0, 0], a, tx * tx * tx);
		let pb = vec.scale([0, 0], b, 3 * tx * tx * t);
		let pc = vec.scale([0, 0], c, 3 * tx * t * t);
		let pd = vec.scale([0, 0], d, t * t * t);
		return vec.add(
			pa,
			vec.add(pa, pa, pb),
			vec.add(pc, pc, pd));
	}

	// Evaluates cubic bezier first derivative at t, returns point.
	export function qprime(cp: Bezier, t: number): Pt {
		let tx = 1.0 - t;
		let pA = vec.scale([0, 0], vec.sub([0, 0], cp[1], cp[0]), 3 * tx * tx),
			pB = vec.scale([0, 0], vec.sub([0, 0], cp[2], cp[1]), 6 * tx * t),
			pC = vec.scale([0, 0], vec.sub([0, 0], cp[3], cp[2]), 3 * t * t);
		return vec.add([0, 0], vec.add([0, 0], pA, pB), pC);
	}

	// Evaluates cubic bezier to second derivative at t, returns point.
	export function qprimeprime(cp: Bezier, t: number): Pt {
		let a = vec.scale([0, 0], cp[1], 2);
		vec.sub(a, cp[2], a);
		vec.add(a, a, cp[0]);
		vec.scale(a, a, 6 * (1.0 - t));

		let b = vec.scale([0, 0], cp[2], 2);
		vec.sub(b, cp[3], b);
		vec.add(b, b, cp[1]);
		vec.scale(b, b, 6 * t);

		return vec.add(a, a, b);

	}
}

function computeTangent(a: Pt, b: Pt) {
	let t: Pt = [0, 0];
	vec.sub(t, a, b);
	return vec.normalize(t, t);
}

function filterDuplicates(pts: Pt[]): Pt[] {
	if (pts.length == 0) {
		return [];
	}

	let [fx, fy] = pts[0];
	let res: Pt[] = [[fx, fy]];
	for (let i = 1, n = pts.length; i < n; i++) {
		let [ax, ay] = pts[i - 1];
		let [bx, by] = pts[i];
		if (ax == bx && bx == by) {
			continue;
		}
		res.push([bx, by]);
	}
	return res;
}

function chordLengthParameterize(pts: Pt[]): number[] {
	var u = [0];
	for (let i = 1, n = pts.length; i < n; i++) {
		const cu = u[i - 1] + vec.len(vec.sub([0, 0], pts[i], pts[i - 1]));
		u.push(cu);
	}
	let lu = u[u.length - 1];
	return u.map((x: number) => {
		return x / lu;
	});
}

function generateBezier(
	pts: Pt[],
	params: number[],
	lt: Pt,
	rt: Pt
): Bezier {
	const n = pts.length,
		fp = pts[0],
		lp = pts[n - 1];

	let A: [Pt, Pt][] = [];
	for (let i = 0, n = params.length; i < n; i++) {
		let u = params[i],
			ux = 1 - u;
		A.push(
			[
				vec.scale([0, 0], lt, 3 * u * (ux * ux)),
				vec.scale([0, 0], rt, 3 * ux * (u * u))
			]
		);
	}

	let C = [[0, 0], [0, 0]];
	let X = [0, 0];

	for (let i = 0, n = pts.length; i < n; i++) {
		let u = params[i],
			a = A[i];

		C[0][0] += vec.dot(a[0], a[0]);
		C[0][1] += vec.dot(a[0], a[1]);
		C[1][0] += vec.dot(a[0], a[1]);
		C[1][1] += vec.dot(a[1], a[1]);

		let tmp = vec.sub(
			[0, 0],
			pts[i],
			bezier.q([fp, fp, lp, lp], u));

		X[0] += vec.dot(a[0], tmp);
		X[1] += vec.dot(a[1], tmp);
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
	const segLen = vec.len(vec.sub([0, 0], fp, lp)),
		epsilon = 1.0e-6 * segLen;
	if (alpha_l < epsilon || alpha_r < epsilon) {
		const a = vec.scale([0, 0], lt, segLen / 3.0),
			b = vec.scale([0, 0], rt, segLen / 3.0);
		return [fp, vec.add(a, fp, a), vec.add(b, lp, b), lp];
	}

	const a = vec.scale([0, 0], lt, alpha_l),
		b = vec.scale([0, 0], rt, alpha_r);
	return [fp, vec.add(a, fp, a), vec.add(b, lp, b), lp];
}

function computeMaxError(
	pts: Pt[],
	bez: Bezier,
	params: number[]
): [number, number] {
	let maxDist = 0,
		splitPt = pts.length / 2,
		distMap = mapTToRelativeDistances(bez, 10);

	for (let i = 0, n = pts.length; i < n; i++) {
		let pt = pts[i],
			t = findT(bez, params[i], distMap, 10),
			v = vec.sub([0, 0], bezier.q(bez, t), pt),
			dist = v[0] * v[0] + v[1] * v[1];

		if (dist > maxDist) {
			maxDist = dist;
			splitPt = i;
		}

	}

	return [maxDist, splitPt];
}

function findT(
	bez: Bezier,
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
		prev: Pt = bez[0];
	for (let i = 1; i <= parts; i++) {
		let curr = bezier.q(bez, i / parts);
		len += vec.len(vec.sub([0, 0], curr, prev));
		dists.push(len);
		prev = curr;
	}
	// Normalize B_length to the same interval as parameter distances; 0 to 1
	return dists.map(x => x / len);
}

function fitCubic(
	pts: Pt[],
	lt: Pt,
	rt: Pt,
	err: number
): Bezier[] {
	if (pts.length == 2) {
		let dist = vec.len(vec.sub([0, 0], pts[0], pts[1])) / 3.0,
			a = vec.scale([0, 0], lt, dist),
			b = vec.scale([0, 0], rt, dist);
		return [
			[
				pts[0],
				vec.add(a, pts[0], a),
				vec.add(b, pts[1], b),
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
	let centerVec = vec.sub([0, 0], pts[splitPt - 1], pts[splitPt + 1]);

	if ((centerVec[0] === 0) && centerVec[1] === 0) {
		let [x, y] = vec.sub(centerVec, pts[splitPt - 1], pts[splitPt]);
		centerVec = [-y, x];
	}

	let toCenterTan = vec.normalize([0, 0], centerVec),
		frCenterTan = vec.scale([0, 0], toCenterTan, -1);

	let a = fitCubic(pts.slice(0, splitPt + 1), lt, toCenterTan, err),
		b = fitCubic(pts.slice(splitPt), frCenterTan, rt, err);
	return a.concat(b);
}

function reparameterize(
	bez: Bezier,
	pts: Pt[],
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
	pt: Pt,
	u: number
): number {
	const d = vec.sub([0, 0], bezier.q(bez, u), pt),
		qprime = bezier.qprime(bez, u),
		[x, y] = qprime,
		numerator = vec.dot(d, qprime),
		denominator = (x * x + y * y) + 2 * vec.dot(d, bezier.qprimeprime(bez, u));
	return (denominator === 0)
		? u
		: u - (numerator / denominator);
}

export function fit(
	pts: Pt[],
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
